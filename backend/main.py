import os
from fastapi import FastAPI, Depends, HTTPException, Query, Form, File, UploadFile
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

os.makedirs("static", exist_ok=True)

DATABASE_URL = "sqlite:///./pens.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)

class Pen(Base):
    __tablename__ = "pens"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    image = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    seller_id = Column(Integer, ForeignKey("users.id"))
    seller = relationship("User")

class Cart(Base):
    __tablename__ = "cart"
    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"))
    pen_id = Column(Integer, ForeignKey("pens.id"))
    quantity = Column(Integer, default=1)
    buyer = relationship("User")
    pen = relationship("Pen")

class Purchase(Base):
    __tablename__ = "purchases"
    id = Column(Integer, primary_key=True, index=True)
    buyer_id = Column(Integer, ForeignKey("users.id"))
    pen_id = Column(Integer, ForeignKey("pens.id"))
    transaction_hash = Column(String, nullable=True)
    buyer = relationship("User")
    pen = relationship("Pen")

Base.metadata.create_all(bind=engine)

class PenSchema(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    price: Optional[float] = None
    seller_id: Optional[int] = None

    class Config:
        from_attributes = True

class CartSchema(BaseModel):
    id: Optional[int] = None
    buyer_id: int
    pen_id: int
    quantity: int

    class Config:
        from_attributes = True

class PurchaseSchema(BaseModel):
    id: Optional[int] = None
    buyer_id: int
    pen_id: int
    transaction_hash: Optional[str] = None

    class Config:
        from_attributes = True

app = FastAPI()

origins = ["http://localhost:3000", "http://127.0.0.1:8000","http://localhost:5173","http://localhost:5174"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/static", StaticFiles(directory="static"), name="static")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/register_seller")
async def register_seller(
    wallet_address: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    existing_seller = db.query(User).filter(User.wallet_address == wallet_address).first()
    if existing_seller:
        raise HTTPException(status_code=400, detail="Wallet address already registered")
    
    seller = User(wallet_address=wallet_address, password=password, role="seller")
    db.add(seller)
    db.commit()
    db.refresh(seller)
    return {"message": "Seller registered successfully", "seller_id": seller.id}

@app.post("/login_seller")
async def login_seller(
    wallet_address: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    seller = db.query(User).filter(User.wallet_address == wallet_address, User.password == password, User.role == "seller").first()
    if not seller:
        raise HTTPException(status_code=400, detail="Invalid wallet address or password")
    return {"message": "Login successful", "seller_id": seller.id}

@app.get("/all_pens/", response_model=List[PenSchema])
async def get_all_pens(db: Session = Depends(get_db)):
    return db.query(Pen).all()

@app.get("/search_pen_by_name", response_model=List[PenSchema])
async def search_pens(
    name: Optional[str] = Query(None, description="Название ручки"),
    db: Session = Depends(get_db),
):
    query = db.query(Pen)
    if name:
        query = query.filter(Pen.name.ilike(f"%{name}%"))
    results = query.all()

    if not results:
        raise HTTPException(status_code=404, detail="No pens found")
    return results

@app.get("/cart/{buyer_id}", response_model=List[CartSchema])
async def get_cart(buyer_id: int, db: Session = Depends(get_db)):
    cart_items = db.query(Cart).filter(Cart.buyer_id == buyer_id).all()
    if not cart_items:
        raise HTTPException(status_code=404, detail="Cart is empty")
    return cart_items

@app.post("/add_pen", response_model=PenSchema)
async def add_pen(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    price: float = Form(...),
    image: UploadFile = File(None),
    seller_id: int = Form(...),
    db: Session = Depends(get_db),
):
    seller = db.query(User).filter(User.id == seller_id, User.role == "seller").first()
    if not seller:
        raise HTTPException(status_code=400, detail="Only sellers can add pens")
    image_filename = None
    if image:
        image_filename = image.filename
        file_location = f"static/{image_filename}"
        with open(file_location, "wb+") as file_object:
            file_object.write(await image.read())
    pen = Pen(name=name, description=description, image=image_filename, price=price, seller_id=seller_id)
    db.add(pen)
    db.commit()
    db.refresh(pen)
    return pen

@app.post("/add_to_cart", response_model=CartSchema)
async def add_to_cart(
    buyer_id: int = Form(...),
    pen_id: int = Form(...),
    quantity: int = Form(1),
    db: Session = Depends(get_db),
):
    buyer = db.query(User).filter(User.id == buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")

    pen = db.query(Pen).filter(Pen.id == pen_id).first()
    if not pen:
        raise HTTPException(status_code=404, detail="Pen not found")

    cart_item = Cart(buyer_id=buyer_id, pen_id=pen_id, quantity=quantity)
    db.add(cart_item)
    db.commit()
    db.refresh(cart_item)
    return cart_item

@app.post("/buy_pen/{pen_id}")
async def buy_pen(
    pen_id: int,
    buyer_id: int = Form(...),
    transaction_hash: str = Form(...),
    db: Session = Depends(get_db),
):
    buyer = db.query(User).filter(User.id == buyer_id).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found")

    pen = db.query(Pen).filter(Pen.id == pen_id).first()
    if not pen:
        raise HTTPException(status_code=404, detail="Pen not found")

    purchase = Purchase(buyer_id=buyer_id, pen_id=pen_id, transaction_hash=transaction_hash)
    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    return {"message": "Purchase successful", "purchase_id": purchase.id}

@app.put("/edit_pen/{pen_id}", response_model=PenSchema)
async def edit_pen(
    pen_id: int,
    name: str = Form(...),
    description: Optional[str] = Form(None),
    price: float = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    pen = db.query(Pen).filter(Pen.id == pen_id).first()
    if pen is None:
        raise HTTPException(status_code=404, detail="Pen not found")
    
    pen.name = name
    pen.description = description
    pen.price = price

    if image:
        image_filename = image.filename
        file_location = f"static/{image_filename}"
        with open(file_location, "wb+") as file_object:
            file_object.write(await image.read())
        pen.image = image_filename

    db.commit()
    db.refresh(pen)
    return pen

@app.delete("/delete_pen/{pen_id}")
async def delete_pen(
    pen_id: int,
    db: Session = Depends(get_db)
):
    pen = db.query(Pen).filter(Pen.id == pen_id).first()
    if pen is None:
        raise HTTPException(status_code=404, detail="Pen not found")

    db.delete(pen)
    db.commit()
    return {"message": "Pen deleted successfully"}

@app.delete("/remove_from_cart/{cart_item_id}")
async def remove_from_cart(cart_item_id: int, db: Session = Depends(get_db)):
    cart_item = db.query(Cart).filter(Cart.id == cart_item_id).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    db.delete(cart_item)
    db.commit()
    return {"message": "Cart item deleted successfully"}
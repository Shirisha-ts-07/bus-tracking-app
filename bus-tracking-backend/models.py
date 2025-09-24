from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    create_engine,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="user", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    active: Mapped[int] = mapped_column(Integer, default=1)

    stops: Mapped[list[RouteStop]] = relationship("RouteStop", back_populates="route", cascade="all, delete-orphan")


class Stop(Base):
    __tablename__ = "stops"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)

    routes: Mapped[list[RouteStop]] = relationship("RouteStop", back_populates="stop", cascade="all, delete-orphan")


class RouteStop(Base):
    __tablename__ = "route_stops"

    route_id: Mapped[int] = mapped_column(ForeignKey("routes.id"), primary_key=True)
    stop_id: Mapped[int] = mapped_column(ForeignKey("stops.id"), primary_key=True)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)

    route: Mapped[Route] = relationship("Route", back_populates="stops")
    stop: Mapped[Stop] = relationship("Stop", back_populates="routes")


class Bus(Base):
    __tablename__ = "buses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    plate: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    capacity: Mapped[Optional[int]] = mapped_column(Integer)
    route_id: Mapped[Optional[int]] = mapped_column(ForeignKey("routes.id"))
    device_id: Mapped[Optional[str]] = mapped_column(String(128))


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bus_id: Mapped[int] = mapped_column(ForeignKey("buses.id"))
    route_id: Mapped[int] = mapped_column(ForeignKey("routes.id"))
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    end_time: Mapped[Optional[datetime]] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)


class VehiclePosition(Base):
    __tablename__ = "vehicle_positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bus_id: Mapped[int] = mapped_column(ForeignKey("buses.id"), index=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    heading: Mapped[Optional[float]] = mapped_column(Float)
    speed: Mapped[Optional[float]] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))


def get_engine(database_url: str):
    return create_engine(database_url, pool_pre_ping=True)


def create_session_factory(database_url: str):
    engine = get_engine(database_url)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)



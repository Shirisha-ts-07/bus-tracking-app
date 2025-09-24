from contextlib import contextmanager
from typing import Iterator

from flask import current_app, g

from models import Base, create_session_factory


def init_db(app):
    app.session_factory = create_session_factory(app.config["DATABASE_URL"])  # type: ignore[attr-defined]

    @app.teardown_appcontext
    def remove_session(exception=None):
        session = g.pop("db_session", None)
        if session is not None:
            session.close()


def create_all_tables(app):
    # For dev only; in prod use Alembic migrations
    from sqlalchemy import create_engine

    engine = create_engine(app.config["DATABASE_URL"])  # type: ignore[index]
    Base.metadata.create_all(bind=engine)


@contextmanager
def get_db_session() -> Iterator:
    if hasattr(current_app, "session_factory"):
        session = current_app.session_factory()  # type: ignore[attr-defined]
    else:
        raise RuntimeError("Session factory not initialized. Call init_db(app) in app startup.")
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()



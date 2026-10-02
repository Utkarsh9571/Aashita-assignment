import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.db.session import Base, SessionLocal, engine
from app.models import Booking, Room  # noqa: F401 - Ensure models are registered on Base
from app.routers import bookings, rooms
from app.seed import seed_rooms

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("meeting_rooms_api")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager:
    1. Ensures database tables are created.
    2. Seeds initial meeting rooms if the table is empty.
    """
    logger.info("Initializing database tables and seed data...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seeded_count = seed_rooms(db)
        if seeded_count > 0:
            logger.info(f"Seeded {seeded_count} default meeting rooms.")
        else:
            logger.info("Rooms already exist in the database.")
    except Exception as e:
        logger.error(f"Error during database startup seed: {e}")
    finally:
        db.close()
    yield
    logger.info("Shutting down application...")


app = FastAPI(
    title="Meeting Room Booking System API",
    description="REST API for scheduling, conflict validation, and slot discovery for meeting rooms.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration suitable for both local development and Vercel deployments
origins = settings.parsed_cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if "*" not in origins else ["*"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# CLEAN ERROR HANDLING (NEVER EXPOSE RAW STACK TRACES OR SQL ERRORS TO CLIENTS)
# ==============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Converts Pydantic validation errors into clean, concise messages suitable for toasts.
    Formats errors into a single human-readable detail string without un-serializable objects.
    """
    error_messages = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []) if loc != "body")
        msg = err.get("msg", "Invalid value")
        # Strip ValueError prefix if added by Pydantic
        msg = msg.removeprefix("Value error, ")
        if field:
            error_messages.append(f"{field}: {msg}")
        else:
            error_messages.append(msg)

    combined_msg = "; ".join(error_messages) if error_messages else "Request validation failed."
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": combined_msg},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Formats standard HTTP exceptions cleanly with consistent JSON detail."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """
    Catches any lower-level database errors (connections, constraints, query failures).
    Logs the exception internally while returning a clean, safe message to the client.
    Guarantees no raw SQL statements, table names, or db credentials leak.
    """
    logger.error(f"Database error during {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "A database error occurred. Please try again later."},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Global catch-all exception handler.
    Logs the exception internally while returning a clean, safe message to the client.
    Prevents any sensitive internal stack traces from leaking.
    """
    logger.error(f"Unhandled exception during {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please try again later."},
    )


# ==============================================================================
# ROUTERS & HEALTH CHECK
# ==============================================================================

app.include_router(rooms.router)
app.include_router(bookings.router)


@app.get("/api/health", tags=["Health"], summary="API Health Check")
def health_check():
    """Health check endpoint to verify service availability."""
    return {
        "status": "healthy",
        "service": "meeting-room-booking-api",
        "environment": settings.ENVIRONMENT,
    }

"""
Database configuration and SQLAlchemy ORM models for NeuroScope 3D.
Manages study tracking, model runs, volume results, evaluation metrics, and failure logs.
"""

from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from .config import DATABASE_URL

# SQLAlchemy Setup
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Study(Base):
    """Stores metadata for an uploaded 4-modality study set."""
    __tablename__ = "studies"

    study_id = Column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    created_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    status = Column(String(20), default="VALIDATED")  # VALIDATED, PROCESSING, COMPLETED, FAILED

    t1_filename = Column(String(255), nullable=False)
    t1gd_filename = Column(String(255), nullable=False)
    t2_filename = Column(String(255), nullable=False)
    flair_filename = Column(String(255), nullable=False)
    expert_mask_filename = Column(String(255), nullable=True)

    sha256_hash = Column(String(64), nullable=False)
    is_skull_stripped = Column(Boolean, default=True)
    dataset_profile = Column(String(30), default="brats")

    # Relationships
    runs = relationship("InferenceRun", back_populates="study", cascade="all, delete-orphan")


class InferenceRun(Base):
    """Stores details for a specific MONAI model execution run."""
    __tablename__ = "inference_runs"

    run_id = Column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    study_id = Column(String(36), ForeignKey("studies.study_id"), nullable=False)
    model_name = Column(String(50), default="MONAI_SegResNet_v1")
    inference_time_seconds = Column(Float, nullable=False)
    output_nifti_path = Column(String(255), nullable=False)
    executed_at = Column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    study = relationship("Study", back_populates="runs")
    volumetrics = relationship("Volumetrics", back_populates="run", cascade="all, delete-orphan")
    metrics = relationship("EvaluationMetric", back_populates="run", cascade="all, delete-orphan")


class Volumetrics(Base):
    """Stores physical volume computations (WT, TC, ET) in mL."""
    __tablename__ = "volumetrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(36), ForeignKey("inference_runs.run_id"), nullable=False)
    region = Column(String(10), nullable=False)  # 'WT', 'TC', 'ET'
    voxel_count = Column(Integer, nullable=False)
    spacing_x = Column(Float, nullable=False)
    spacing_y = Column(Float, nullable=False)
    spacing_z = Column(Float, nullable=False)
    volume_ml = Column(Float, nullable=False)

    run = relationship("InferenceRun", back_populates="volumetrics")


class EvaluationMetric(Base):
    """Stores Dice Similarity, Sensitivity, and HD95 (mm) scores when an expert mask is provided."""
    __tablename__ = "evaluation_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(36), ForeignKey("inference_runs.run_id"), nullable=False)
    region = Column(String(10), nullable=False)  # 'WT', 'TC', 'ET'
    dice_score = Column(Float, nullable=False)
    sensitivity = Column(Float, nullable=False)
    hd95_mm = Column(Float, nullable=True)        # 95th percentile Hausdorff Distance in mm

    run = relationship("InferenceRun", back_populates="metrics")


class FailureLog(Base):
    """Audit log for rejected or corrupted inputs (Judges' Failure Pack)."""
    __tablename__ = "failure_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    error_code = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    file_info = Column(Text, nullable=True)


from sqlalchemy import text


def init_db():
    """Initializes SQLite tables and handles lightweight schema migration."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE studies ADD COLUMN dataset_profile VARCHAR(30) DEFAULT 'brats'"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE evaluation_metrics ADD COLUMN hd95_mm FLOAT"))
            conn.commit()
        except Exception:
            pass


def get_db():
    """FastAPI Dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
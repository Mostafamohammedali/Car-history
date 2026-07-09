"""
Django Signals for Real-time AI Re-evaluation
==============================================
Triggers AI re-evaluation whenever related car data changes:
- Repairshops (maintenance logs, computer scan results)
- AccidentImage (accident photos added/deleted)

Uses threading to run the AI evaluation asynchronously so it doesn't
block the HTTP request/response cycle.
"""

import logging
import threading
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

logger = logging.getLogger(__name__)

# Flag to prevent recursive signal firing during report save
_evaluation_in_progress = set()


def _trigger_async_evaluation(car_vin: str):
    """
    Run the full AI evaluation in a background thread.
    Uses a lock set to prevent duplicate concurrent evaluations for the same VIN.
    """
    if car_vin in _evaluation_in_progress:
        logger.info(f"[SIGNAL] Evaluation already in progress for VIN {car_vin}, skipping.")
        return

    def _run():
        try:
            _evaluation_in_progress.add(car_vin)
            logger.info(f"[SIGNAL] Starting AI re-evaluation for VIN: {car_vin}")

            from ai_chat.services import AutomotiveAIAssistant
            assistant = AutomotiveAIAssistant()
            result = assistant.evaluate_car_comprehensive(car_vin)

            if result.get("success"):
                logger.info(f"[SIGNAL] AI re-evaluation completed for VIN {car_vin}")
            else:
                logger.warning(f"[SIGNAL] AI re-evaluation failed for VIN {car_vin}: {result.get('error')}")
        except Exception as e:
            logger.error(f"[SIGNAL] Error during async AI evaluation for VIN {car_vin}: {e}")
        finally:
            _evaluation_in_progress.discard(car_vin)

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()


# ═══════════════════════════════════════════════════════
# Repairshops signals (maintenance / computer scan data)
# ═══════════════════════════════════════════════════════

@receiver(post_save, sender='cars.Repairshops')
def repairshop_saved(sender, instance, **kwargs):
    """Trigger re-evaluation when a repair shop record is created or updated."""
    try:
        car_vin = instance.car.vin
        logger.info(f"[SIGNAL] Repairshop saved for car VIN: {car_vin}")
        _trigger_async_evaluation(car_vin)
    except Exception as e:
        logger.error(f"[SIGNAL] Error in repairshop_saved signal: {e}")


@receiver(post_delete, sender='cars.Repairshops')
def repairshop_deleted(sender, instance, **kwargs):
    """Trigger re-evaluation when a repair shop record is deleted."""
    try:
        car_vin = instance.car.vin
        logger.info(f"[SIGNAL] Repairshop deleted for car VIN: {car_vin}")
        _trigger_async_evaluation(car_vin)
    except Exception as e:
        logger.error(f"[SIGNAL] Error in repairshop_deleted signal: {e}")


# ═══════════════════════════════════════════════════════
# AccidentImage signals (accident photos)
# ═══════════════════════════════════════════════════════

@receiver(post_save, sender='cars.AccidentImage')
def accident_image_saved(sender, instance, **kwargs):
    """Trigger re-evaluation when an accident image is added or updated."""
    try:
        car_vin = instance.car.vin
        logger.info(f"[SIGNAL] AccidentImage saved for car VIN: {car_vin}")
        _trigger_async_evaluation(car_vin)
    except Exception as e:
        logger.error(f"[SIGNAL] Error in accident_image_saved signal: {e}")


@receiver(post_delete, sender='cars.AccidentImage')
def accident_image_deleted(sender, instance, **kwargs):
    """
    Trigger re-evaluation when an accident image is deleted.
    This should cause safety_score and body_score to increase.
    """
    try:
        car_vin = instance.car.vin
        logger.info(f"[SIGNAL] AccidentImage deleted for car VIN: {car_vin}")
        _trigger_async_evaluation(car_vin)
    except Exception as e:
        logger.error(f"[SIGNAL] Error in accident_image_deleted signal: {e}")


# ═══════════════════════════════════════════════════════
# Cars signals (core car data: mileage, year)
# ═══════════════════════════════════════════════════════

@receiver(post_save, sender='cars.Cars')
def car_data_saved(sender, instance, created, **kwargs):
    """
    Trigger re-evaluation when car mileage or year changes.
    This ensures that engine_score (mileage-based) and 
    safety_score (age-based) stay accurate.
    """
    try:
        # We only care about updates to mileage and year. 
        # For simplicity, we trigger on any save of the car model.
        car_vin = instance.vin
        logger.info(f"[SIGNAL] Car data updated for VIN: {car_vin}")
        _trigger_async_evaluation(car_vin)
    except Exception as e:
        logger.error(f"[SIGNAL] Error in car_data_saved signal: {e}")

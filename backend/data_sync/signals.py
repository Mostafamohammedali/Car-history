"""
Signals for data_sync app.
Triggers a single-config sync when an ExternalDBConfig record is saved.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import ExternalDBConfig
from .tasks import sync_single_config
import logging


logger = logging.getLogger(__name__)


@receiver(post_save, sender=ExternalDBConfig)
def trigger_db_sync_on_config_save(sender, instance, created, **kwargs):
    """
    Trigger a config sync when an ExternalDBConfig record is created or updated.
    Runs asynchronously after a 60-second delay so the server finishes starting.
    """
    try:
        if instance.is_active:
            if created or kwargs.get('update_fields') is None:
                logger.info(
                    f"[SIGNAL] Scheduling sync for new/updated config: {instance.name}"
                )
                # Apply with countdown=60 so the server is fully up first
                sync_single_config.apply_async(
                    args=[instance.id],
                    countdown=60,
                )

            # --- New: Automatic Field Discovery ---
            if created:
                from .tasks import sync_discover_fields
                logger.info(
                    f"[SIGNAL] Scheduling AUTO-DISCOVERY for new config: {instance.name}"
                )
                # Discovery can run sooner
                sync_discover_fields.apply_async(
                    args=[instance.id],
                    countdown=10,
                )
    except Exception as e:
        logger.error(
            f"[SIGNAL] Error scheduling sync for {instance.name}: {e}"
        )

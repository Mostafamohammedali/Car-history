"""
management/commands/run_sync.py
================================
Django management command that triggers the full 24-hour sync cycle.

Usage (development / Windows Task Scheduler):
  python manage.py run_sync
  python manage.py run_sync --stage db       # Stage 1 only
  python manage.py run_sync --stage api      # Stage 2 only
  python manage.py run_sync --config-id 3   # Single config by ID

This command is the recommended trigger when CELERY_TASK_ALWAYS_EAGER=True
(i.e. no real Celery broker is running).  Schedule it in Windows Task
Scheduler every 24 hours as an alternative to 'celery beat'.
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Run the 24-hour data synchronisation cycle. "
        "Fetches data from configured external databases and APIs and "
        "upserts it into the local database. "
        "Never touches user-facing search views."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--stage',
            type=str,
            choices=['all', 'db', 'api'],
            default='all',
            help=(
                "Which sync stage to run: "
                "'all' (default) = DB + API, "
                "'db' = external DB sync only, "
                "'api' = API source sync only."
            ),
        )
        parser.add_argument(
            '--config-id',
            type=int,
            default=None,
            help='Sync a single ExternalDBConfig by its primary key.',
        )

    def handle(self, *args, **options):
        stage = options['stage']
        config_id = options.get('config_id')

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"\n{'='*60}\n"
                f"  Car History — Data Sync  |  {timezone.now().strftime('%Y-%m-%d %H:%M:%S')} UTC\n"
                f"  Stage: {stage.upper()}  |  Config ID: {config_id or 'ALL'}\n"
                f"{'='*60}\n"
            )
        )

        from data_sync.tasks import (
            auto_sync_all,
            sync_databases,
            sync_api_sources,
            sync_single_config,
        )

        try:
            if config_id:
                # Single-config mode
                self.stdout.write(f"  → Syncing config ID: {config_id}")
                result = sync_single_config.apply(kwargs={'config_id': config_id})
                self._report({'single_config': result.result})

            elif stage == 'all':
                self.stdout.write("  → Running full sync cycle (Stage 1: DB + Stage 2: API)…")
                result = auto_sync_all.apply()
                self._report(result.result or {})

            elif stage == 'db':
                self.stdout.write("  → Stage 1: External database sync…")
                result = sync_databases.apply()
                self._report(result.result or {})

            elif stage == 'api':
                self.stdout.write("  → Stage 2: API source sync…")
                result = sync_api_sources.apply()
                self._report(result.result or {})

            self.stdout.write(
                self.style.SUCCESS(
                    f"\n✓ Sync complete at "
                    f"{timezone.now().strftime('%Y-%m-%d %H:%M:%S')} UTC\n"
                )
            )

        except Exception as e:
            logger.error(f"run_sync command failed: {e}")
            raise CommandError(f"Sync failed: {e}")

    def _report(self, result: dict):
        """Print a human-readable summary of the sync result."""
        if not result:
            self.stdout.write("  (no result data returned)")
            return

        if 'error' in result:
            self.stdout.write(
                self.style.ERROR(f"  ✗ Error: {result['error']}")
            )
            return

        for key, value in result.items():
            if isinstance(value, dict):
                synced = value.get('synced', value.get('total_synced', '?'))
                failed = value.get('failed', value.get('total_failed', '?'))
                status = '✓' if value.get('success', True) else '✗'
                self.stdout.write(
                    f"  {status}  {key}: synced={synced}, failed={failed}"
                )
            else:
                self.stdout.write(f"  {key}: {value}")

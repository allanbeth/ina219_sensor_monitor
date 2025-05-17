import logging, time, os
from sensor_monitor.config import LOG_FILE


logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s',
                    filename=LOG_FILE,
                    filemode='a')

class sensor_logger:
        
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.max_log_size = 1000 * 1024 * 1024

    def set_log_size(self, max):
        self.info(f"Log file Size Value - {max}")
        self.max_log_size = max * 1024 * 1024
        self.info(f"Log file Size Set - {self.max_log_size}")

    def _check_log_size(self):
        """Reset the log file if it exceeds MAX_LOG_SIZE."""
        if os.path.exists(LOG_FILE) and os.path.getsize(LOG_FILE) > self.max_log_size:
            with open(LOG_FILE, 'w') as f:
                pass  # Truncate the file
            self.info("Log file reset due to size limit.")

    def debug(self, log_entry):
        self._check_log_size()
        self.logger.debug(log_entry)

    def info(self, log_entry):
        self._check_log_size()
        print(log_entry)
        self.logger.info(log_entry)

    def warning(self, log_entry):
        self._check_log_size()
        self.logger.warning(log_entry)

    def error(self, log_entry):
        self._check_log_size()
        self.logger.error(log_entry)

    def critical(self, log_entry):
        self._check_log_size()
        self.logger.critical(log_entry)

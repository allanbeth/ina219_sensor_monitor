import logging
import os

class SensorMonitorLogger:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(SensorMonitorLogger, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, log_file="sensor_monitor.log", max_log_size_mb=10):
        if self._initialized:
            return
        self.log_file = log_file
        self.max_log_size = max_log_size_mb * 1024 * 1024  # bytes
        self.logger = logging.getLogger("sensor_monitor")
        self.logger.setLevel(logging.INFO)
        self.logger.propagate = False
        self._attach_handler()
        self._initialized = True

    def _attach_handler(self):
        # Remove all handlers first
        for handler in self.logger.handlers[:]:
            self.logger.removeHandler(handler)
            handler.close()
        handler = logging.FileHandler(self.log_file)
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)

    def set_log_size(self, mb):
        self.max_log_size = mb * 1024 * 1024
        self.info(f"Log file size set to {mb} MB.")

    def _check_log_size(self):
        if os.path.exists(self.log_file) and os.path.getsize(self.log_file) > self.max_log_size:
            # Remove and close all handlers before truncating
            for handler in self.logger.handlers[:]:
                self.logger.removeHandler(handler)
                handler.close()
            # Truncate the file
            with open(self.log_file, 'w'):
                pass
            # Re-attach handler
            self._attach_handler()
            self.logger.info("Log file reset due to size limit.")

    def debug(self, msg):
        self._check_log_size()
        self.logger.debug(msg)
        self._flush()

    def info(self, msg):
        self._check_log_size()
        self.logger.info(msg)
        self._flush()

    def warning(self, msg):
        self._check_log_size()
        self.logger.warning(msg)
        self._flush()

    def error(self, msg):
        self._check_log_size()
        self.logger.error(msg)
        self._flush()

    def critical(self, msg):
        self._check_log_size()
        self.logger.critical(msg)
        self._flush()

    def _flush(self):
        for handler in self.logger.handlers:
            handler.flush()

# Create a single shared logger instance
logger = SensorMonitorLogger()

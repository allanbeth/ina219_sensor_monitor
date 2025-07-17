# sensor_monitor/logger.py

import logging, time, os
from sensor_monitor.config_manager import LOG_FILE


class sensor_logger:
        
    def __init__(self):
        self.logger = logging.getLogger("sensor_monitor")
        self.max_log_size = 1000 * 1024 * 1024
        if not self.logger.handlers:
            handler = logging.FileHandler(LOG_FILE)
            formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
            self.logger.propagate = False

    def set_log_size(self, max):
        self.max_log_size = max * 1024 * 1024
        self.info(f"Log file Size Set Sucessfully")

    def _check_log_size(self):
        if os.path.exists(LOG_FILE) and os.path.getsize(LOG_FILE) > self.max_log_size:
            with open(LOG_FILE, 'w') as f:
                pass  
            self.info("Log file reset due to size limit.")

    def debug(self, log_entry):
        self._check_log_size()
        self.logger.debug(log_entry)

    def info(self, log_entry):
        self._check_log_size()
        #print(log_entry)
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

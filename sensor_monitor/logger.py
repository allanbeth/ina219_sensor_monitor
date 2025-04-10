import logging, time
from sensor_monitor.config import LOG_FILE

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s', filename=LOG_FILE, filemode='a')

class sensor_logger:
        
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def log_data(self, name, data):
        # Logs sensor data to a file with debugging.
        try:           
            log_entry = (f"{time.strftime('%Y-%m-%d %H:%M:%S')},"
                            f"{name},"
                    f"{data['voltage']:.2f}V,{data['current']:.3f}A,{data['power']:.3f}W,")
            
            self.save_entry(log_entry)
            
            #logging.info("Logged data: %s", log_entry)
        except Exception as e:
            logging.error("Error logging data: %s", str(e))
        
        #time.sleep(2)

    def save_entry(self, log_entry):
        with open(LOG_FILE, "a") as log_file:
            log_file.write(log_entry + "\n")


    def debug(self, log_entry):
        self.logger.debug(log_entry)
        self.save_entry(log_entry)
        

    def info(self, log_entry):
        self.logger.info(log_entry)
        self.save_entry(log_entry)
        
    def warning(self, log_entry):
        self.logger.warning(log_entry)
        self.save_entry(log_entry)
        
        
    def error(self, log_entry):
        self.logger.error(log_entry)
        self.save_entry(log_entry)


    def critical(self, log_entry):
        self.logger.critical(log_entry)
        self.save_entry(log_entry)

    def resetLog(self):
        with open(LOG_FILE, "w") as data:
            pass

        self.info("Log File Reset Successfully")

    def getLog(self, x):
        fileContent = []
        with open(LOG_FILE, "r") as data:
            for line in data:
                fileContent.append(line)  

        if x == 1:
            fileContent = fileContent[-100:]
        logData = {} 
        fileContent.reverse()
        logData['data'] = fileContent
        return logData
    
 
  
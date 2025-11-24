
console.log('Start debug script');
try {
    console.log('Importing logger...');
    const { logger } = require('../lib/logger');
    console.log('Logger imported successfully');
    logger.info('Test log message');

    console.log('Importing MonitoringExecutor...');
    const { getExecutor } = require('../lib/monitoring/MonitoringExecutor');
    console.log('MonitoringExecutor imported successfully');

    const executor = getExecutor();
    console.log('Executor instance created');
} catch (error) {
    console.error('Import failed:', error);
}

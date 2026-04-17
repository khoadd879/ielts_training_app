let isRabbitMQConnected = false;
let isHealthy = true;

export const setRabbitMQStatus = (connected: boolean) => {
  isRabbitMQConnected = connected;
  isHealthy = connected;
};

export const getHealthStatus = () => ({
  status: isHealthy ? 'healthy' : 'unhealthy',
  rabbitmq: isRabbitMQConnected ? 'connected' : 'disconnected',
  timestamp: new Date().toISOString(),
});

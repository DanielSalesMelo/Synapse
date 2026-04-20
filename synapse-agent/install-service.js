var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name: 'SynapseMonitoringAgent',
  description: 'Serviço de monitoramento e suporte do Synapse.',
  script: require('path').join(__dirname, 'agent.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

// Listen for the "install" event and log when it's done.
svc.on('install',function(){
  svc.start();
  console.log('Serviço SynapseMonitoringAgent instalado e iniciado com sucesso.');
});

svc.install();

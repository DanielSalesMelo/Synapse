var Service = require("node-windows").Service;

// Create a new service object
var svc = new Service({
  name: "SynapseMonitoringAgent",
  script: require("path").join(__dirname, "agent.js"),
});

// Listen for the "uninstall" event and log when it's done.
svc.on("uninstall", function () {
  console.log("Serviço SynapseMonitoringAgent desinstalado com sucesso.");
});

// Uninstall the service.
svc.uninstall();

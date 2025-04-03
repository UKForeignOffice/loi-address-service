module.exports = {
  apps : [
    {
      name      : 'address',
      script    : "server.js",
      instances : "max",
      exec_mode : "cluster"
    }
  ]
}
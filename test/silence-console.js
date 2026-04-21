// Silences all console output during tests
;['log', 'info', 'warn', 'error'].forEach((method) => {
  // eslint-disable-next-line no-console
  console[method] = () => {}
})

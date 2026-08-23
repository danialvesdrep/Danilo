/**
 * `server-only` só funciona dentro do bundler do Next. Scripts de CLI e testes
 * importam os mesmos módulos de servidor, então neutralizamos o pacote aqui.
 */
const Module = require("node:module");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request === "server-only" || request === "client-only") {
    return require.resolve("./empty-module.cjs");
  }
  return originalResolve.call(this, request, ...args);
};

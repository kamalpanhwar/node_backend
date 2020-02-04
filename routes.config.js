exports.routesConfig = function(app) {
  app.post('/repositories', [
    RepositoryController.insert
  ]);

  app.get('/repositories', [
    RepositoryController.list
  ]);

  app.get('/repositories/:id', [
    RepositoryController.findById
  ]);

  app.delete('/repositories/:id', [
    RepositoryController.deleteById
  ]);
};

const express = require('express');
const path = require('path');
const LogsService = require('./logs-service');
const { requireAuth } = require('../middleware/jwt-auth');
const ProjectsService = require('../projects/projects-service');

const logsRouter = express.Router();
const jsonBodyParser = express.json();

logsRouter
  .route('/')
  .all(requireAuth)
  .get(jsonBodyParser, (req, res, next) => {
    // get logs filtered by project and date selectors
    if (req.params.filter === 'projects-and-dates') {
      try {
        validateSelectors(
          req.app.get('db'),
          req.body.selectors,
          next
        );
      } catch (error) {
        return res.status(404).json({ error });
      }

      LogsService.getBySelectors(
        req.app.get('db'),
        req.body.selectors
      )
        .then(logs => {
          res.json(logs.map(LogsService.serializeLog));
        })
        .catch(next);
    }
  })
  .post(requireAuth, jsonBodyParser, (req, res, next) => {
    const { project_id, text } = req.body;
    const newLog = { project_id, text };

    for (const [key, value] of Object.entries(newLog))
      if (value == null)
        return res.status(400).json({
          error: `Missing '${key}' in request body`
        });

    newLog.user_id = req.user.id;

    LogsService.insertLog(
      req.app.get('db'),
      newLog
    )
      .then(log => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${log.id}`))
          .json(LogsService.serializeLog(log));
      })
      .catch(next);
  });

function validateSelectors(db, selectors, next) {
  // check if selectors given
  if (!selectors) 
    throw new Error('No selectors given.');

  Promise.all(
    Object.keys(selectors).map(projectId =>
      new Promise(() => ProjectsService.getById(
        db,
        projectId
      ))
    ))
    .then(projects => {
      let project = null;
      for (project of projects)
        if (!project) 
          throw new Error('One or more of the projects don\'t exist');
    })
    .catch(next);
  return;
}

module.exports = logsRouter;

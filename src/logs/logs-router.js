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
    // get logs within a range of dates
    if (req.params.filter === 'dates') {
      let { start, end } = req.body;
      
      if (start == null)
        return res.status(404).json({
          error: 'Missing \'start\' in request body'
        });
      if (end == null)
        return res.status(404).json({
          error: 'Missing \'end\' in request body'
        });

      try {
        start = new Date(start).toISOString();
        end = new Date(end).toISOString();
      } catch (e) {
        return res.status(404).json({
          error: 'Given invalid ranges'
        });
      }

      LogsService.getByDay(
        req.app.get('db'),
        start,
        end
      )
        .then(logs => {
          res.json(logs.map(LogsService.serializeLog));
        })
        .catch(next);
    }

    // get logs filtered by project and date selectors
    if (req.params.filter === 'projects-and-dates') {
      // selectors is an object where keys are the projects' ids and 
      // the values are the projects' list of day ranges
      const { selectors } = req.body;

      if (!selectors)
        return res.status(404).json({
          error: 'Missing \'selectors\' in request body'
        });

      // check if each project exists
      Promise.all(
        Object.keys(selectors).map(projectId =>
          new Promise(() => ProjectsService.getById(
            db,
            projectId
          ))
        ))
        .then(projects => {
          let project;
          for (project of projects)
            if (!project)
              return res.status(404).json({
                error: 'One or more of the projects selected don\'t exist'
              });
        })
        .catch(next);

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

module.exports = logsRouter;

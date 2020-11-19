const express = require('express');
const ProjectsService = require('./projects-service');
const LogsService = require('../logs/logs-service');
const { requireAuth } = require('../middleware/jwt-auth');

const projectsRouter = express.Router();

projectsRouter
  .route('/')
  .get((req, res, next) => {
    ProjectsService.getAllProjects(req.app.get('db'))
      .then(projects => {
        res.json(projects.map(ProjectsService.serializeProject));
      })
      .catch(next);
  });

projectsRouter
  .route('/:project_id')
  .all(requireAuth)
  .all(checkProjectExists)
  .get((req, res) => {
    // return range of days with logs
    if (req.params.part === 'day-ranges') {
      ProjectsService.getDaysWithLogs(
        req.app.get('db'),
        req.params.project_id
      )
        .then(data => {
          let logs = data.map(log => [new Date(log.start), new Date(log.end)]);
          return res.json(LogsService.mergeLogs(logs));
        })
        .catch(next);
    } else {
      res.json(ProjectsService.serializeProject(res.project));
    }
  });

projectsRouter
  .route('/:project_id/logs/')
  .all(requireAuth)
  .all(checkProjectExists)
  .get((req, res, next) => {
    if (req.params.date) {

    }
    else {
      ProjectsService.getLogsForProject(
        req.app.get('db'),
        req.params.project_id
      )
        .then(logs => {
          res.json(logs.map(LogsService.serializeLog));
        })
        .catch(next);
    }
  });

async function checkProjectExists(req, res, next) {
  try {
    const project = await ProjectsService.getById(
      req.app.get('db'),
      req.params.project_id
    );

    if (!project)
      return res.status(404).json({
        error: 'Project doesn\'t exist'
      });

    res.project = project;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = projectsRouter;

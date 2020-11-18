const express = require('express');
const ProjectsService = require('./projects-service');
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
    res.json(ProjectsService.serializeProject(res.project));
  });

projectsRouter
  .route('/:project_id/logs/')
  .all(requireAuth)
  .all(checkProjectExists)
  .get((req, res, next) => {
    ProjectsService.getLogsForProject(
      req.app.get('db'),
      req.params.project_id
    )
      .then(logs => {
        res.json(logs.map(ProjectsService.serializeProjectLog));
      })
      .catch(next);
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

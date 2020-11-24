const express = require('express');
const path = require('path');
const ProjectsService = require('./projects-service');
const LogsService = require('../logs/logs-service');
const { requireAuth } = require('../middleware/jwt-auth');

const projectsRouter = express.Router();
const jsonBodyParser = express.json();

projectsRouter
  .route('/')
  .all(requireAuth)
  .all((req, res, next) => {
    ProjectsService.getAllProjects(req.app.get('db'), req.user.id)
      .then(projects => {
        res.projects = projects;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    // return range of days with logs for each project
    if (req.query.part === 'day-ranges') {
      Promise.all(res.projects.map(project =>
        ProjectsService.getDaysWithLogs(req.app.get('db'), req.user.id, project.id)
      ))
        .then(projects => {
          let ranges = {};
          projects.forEach(daysWithLogs => {
            daysWithLogs = daysWithLogs.map(range =>
              [new Date(range.start_day),
              new Date(range.end_day)]
            );
            ranges[project.id] = ProjectsService.mergeRanges(daysWithLogs);
          })
          res.json(ranges);
        })
        .catch(next);
    } else {
      res.json(res.projects.map(ProjectsService.serializeProject));
    }
  })
  .post(jsonBodyParser, (req, res, next) => {
    const { title } = req.body;
    const newProject = { title };

    for (const [key, value] of Object.entries(newProject))
      if (value == null)
        return res.status(400).json({
          error: `Missing '${key}' in request body`
        });

    newProject.owner_id = req.user.id;

    ProjectsService.insertProject(
      req.app.get('db'),
      req.user.id,
      newProject
    )
      .then(project => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${project.id}`))
          .json(ProjectsService.serializeProject(project));
      })
      .catch(next);
  });;

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
      req.user.id,
      req.query.project_id
    )
      .then(logs => {
        res.json(logs.map(LogsService.serializeLog));
      })
      .catch(next);
  });

async function checkProjectExists(req, res, next) {
  try {
    const project = await ProjectsService.getById(
      req.app.get('db'),
      req.user.id,
      req.query.project_id
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

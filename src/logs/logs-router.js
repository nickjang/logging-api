const express = require('express');
const path = require('path');
const LogsService = require('./logs-service');
const ProjectsService = require('../projects/projects-service');
const { requireAuth } = require('../middleware/jwt-auth');
const { types } = require('pg');

const logsRouter = express.Router();
const jsonBodyParser = express.json();

logsRouter
  .route('/')
  .all(requireAuth)
  .all(jsonBodyParser)
  .get(async (req, res, next) => {
    // get logs within a range of dates
    if (req.query.filter === 'range') {
      let { start, end } = req.query;

      if (!start)
        return res.status(404).json({
          error: 'Missing \'start\' in request query'
        });
      if (!end)
        return res.status(404).json({
          error: 'Missing \'end\' in request query'
        });

      // check if start and end are valid, and make end not inclusive
      try {
        [start, end] = LogsService.formatStartEndTimes(start, end);
      } catch (e) {
        return res.status(404).json({
          error: 'Given invalid range value(s).'
        });
      }

      LogsService.getByRange(
        req.app.get('db'),
        req.user.id,
        start,
        end
      )
        .then(logs => {
          res.json(logs.map(LogsService.serializeLog));
        })
        .catch(next);
    }

    // get logs filtered by project and date selectors
    if (req.query.filter === 'projects-and-ranges') {
      // selectors is a dictionary where keys are the projects'
      // ids and the values are the projects' list of day ranges
      let selectors = req.query.selectors;

      // check if given selectors
      if (!selectors) {
        return res.status(404).json({
          error: 'Missing \'selectors\' in request query'
        });
      } else {
        selectors = JSON.parse(selectors);
        if (!Object.keys(selectors).length) {
          return res.status(404).json({
            error: 'Missing \'selectors\' in request query'
          });
        }
      }

      // check if each project exists
      const error = await checkIfProjectsExist(req, selectors);
      if (error) {
        if (error.error)
          return res.status(404).json({ error: error.error });
        else if (error.otherError)
          throw new Error(error.otherError);
      }

      // format start and end times, and make end time not inclusive
      try {
        for (projectId in selectors) {
          selectors[projectId] = selectors[projectId].map(selector => {
            if (selector === 'project') return 'project';
            return LogsService.formatStartEndTimes(selector[0], selector[1]);
          });
        }
      } catch (e) {
        return res.status(404).json({
          error: 'Given invalid selector value(s).'
        });
      }

      LogsService.getBySelectors(
        req.app.get('db'),
        req.user.id,
        selectors
      )
        .then(logs => {
          res.json(logs.map(LogsService.serializeLog));
        })
        .catch(next);
    }
  })
  .post((req, res, next) => {
    const { project_id, start_time } = req.body;
    const newLog = { project_id, start_time };

    for (const [key, value] of Object.entries(newLog))
      if (value == null)
        return res.status(400).json({
          error: `Missing '${key}' in request body`
        });

    // check if valid value
    try {
      newLog.start_time = (new Date(start_time)).toISOString();
    } catch (e) {
      return res.status(404).json({
        error: 'Given invalid start time.'
      });
    }

    newLog.user_id = req.user.id;

    LogsService.insertProjectLog(
      req.app.get('db'),
      req.user.id,
      newLog
    )
      .then(log => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${log.id}`))
          .json(LogsService.serializeLog(log));
      })
      .catch(next);
  })
  .patch((req, res, next) => {
    if (req.query.filter === 'ids' && req.query.part === 'format') {
      let { ids, minutes, seconds } = req.body;

      for (const [key, value] of Object.entries({ ids, minutes, seconds }))
        if (value == null)
          return res.status(400).json({
            error: `Missing '${key}' in request body`
          });

      if (!(typeof ids === 'object') || !ids.length)
        return res.status(400).json({
          error: 'Missing id(s) in request body'
        });

      LogsService.updateFormat(
        req.app.get('db'),
        req.user.id,
        ids,
        minutes,
        seconds
      )
        .then(logs => res.json(logs.map(LogsService.serializeLog)))
        .catch(next);
    }
  });

logsRouter
  .route('/:log_id')
  .all(requireAuth)
  .all(checkLogExists)
  .all(jsonBodyParser)
  .patch((req, res, next) => {
    if (req.query.part === 'end-time') {
      let { end_time } = req.body;

      if (!end_time)
        return res.status(404).json({
          error: 'Missing \'end_time\' in request body'
        });

      // check if valid value
      try {
        end_time = (new Date(end_time)).toISOString();
      } catch (e) {
        return res.status(404).json({
          error: 'Given invalid end time.'
        });
      }

      LogsService.endProjectLog(
        req.app.get('db'),
        req.user.id,
        req.params.log_id,
        end_time
      )
        .then(log => {
          res
            .location(path.posix.join(req.originalUrl, `/${log.id}`))
            .json(LogsService.serializeLog(log));
        })
        .catch(next);
    }
  });

async function checkLogExists(req, res, next) {
  try {
    const log = await LogsService.getById(
      req.app.get('db'),
      req.user.id,
      req.params.log_id
    );
    if (!log)
      return res.status(404).json({
        error: 'Log doesn\'t exist'
      });

    res.log = log;
    next();
  } catch (error) {
    next(error);
  }
}

function checkIfProjectsExist(req, selectors) {
  return Promise.all(
    Object.keys(selectors).map(projectId =>
      ProjectsService.getById(req.app.get('db'), req.user.id, projectId)
    ))
    .then(projects => {
      for (const project of projects)
        if (!project)
          throw new Error('Project doesn\'t exist');
      return null;
    })
    .catch(e => {
      if (e.message === 'Project doesn\'t exist')
        return { error: 'One or more of the projects selected don\'t exist' };
      else
        return { otherError: e.message };
    });
}

module.exports = logsRouter;

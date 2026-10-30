// TEMPORARY TEST VERSION of routes/client.js — for testing the customer views only.
// This is Backend B's file. Do NOT hand this back. Restore the original afterwards.
//
// It follows the frozen contract in docs/module-map.md, so it also works as a
// reference to show Backend B what the views expect.

const express = require('express');
const { readJson } = require('../utils/db');
const { paginate } = require('../utils/pagination');
const { PACKAGE_STATUSES } = require('../utils/packageStatus');

const router = express.Router();

// Page size is small on purpose so pagination is easy to see with the sample data.
const PAGE_SIZE = 4;

router.get('/packages', (req, res) => {
  // The owner always comes from the signed-in user, never from the URL or a form.
  const me = global.currentUser.id;
  const q = String(req.query.q || '').trim();
  const status = String(req.query.status || '');

  let packages = readJson('packages.json').filter((p) => p.customerId === me);
  if (q) packages = packages.filter((p) => p.trackingNo.toLowerCase().includes(q.toLowerCase()));
  if (status) packages = packages.filter((p) => p.status === status);

  // Newest arrival first.
  packages.sort((a, b) => new Date(b.arrivedAt) - new Date(a.arrivedAt));

  const result = paginate(packages, {
    page: req.query.page,
    pageSize: PAGE_SIZE,
    path: '/my/packages',
    query: { q, status }
  });

  res.render('client/packages', {
    title: 'My parcels',
    packages: result.items,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    pagination: result.pagination,
    filters: { q, status },
    statuses: PACKAGE_STATUSES
  });
});

router.get('/packages/:id', (req, res) => {
  const parcel = readJson('packages.json').find((p) => p.id === req.params.id);

  if (!parcel) {
    return res.status(404).render('error', {
      title: 'Parcel not found', status: 404, message: 'No parcel with that ID exists.'
    });
  }
  if (parcel.customerId !== global.currentUser.id) {
    return res.status(403).render('error', {
      title: 'Access denied', status: 403, message: 'This parcel belongs to another customer.'
    });
  }

  // Newest event first.
  const tracking = readJson('tracking.json')
    .filter((t) => t.packageId === parcel.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.render('client/package-detail', { title: 'Parcel detail', parcel, tracking });
});

router.get('/notifications', (req, res) => {
  const packages = readJson('packages.json');
  const notifications = readJson('notifications.json')
    .filter((n) => n.userId === global.currentUser.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    // Attach the related parcel so the view can link to it.
    .map((n) => ({ ...n, parcel: packages.find((p) => p.id === n.packageId) }));

  res.render('client/notifications', { title: 'Notifications', notifications });
});

module.exports = router;

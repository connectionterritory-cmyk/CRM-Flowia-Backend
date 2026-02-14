const express = require('express');

const router = express.Router();

router.use((req, res) => {
    res.status(501).json({
        error: 'Legacy database disabled',
        code: 'LEGACY_DB_DISABLED',
    });
});

module.exports = router;

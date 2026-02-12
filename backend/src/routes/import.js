const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ImportService = require('../services/ImportService');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/checkRole');

router.use(auth);
router.use(checkRole('DISTRIBUIDOR'));

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './data'); // Upload to data directory
    },
    filename: (req, file, cb) => {
        cb(null, 'import-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// POST Import Clientes
router.post('/clientes', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const result = await ImportService.importClientes(req.file.path);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Import Ordenes
router.post('/ordenes', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const result = await ImportService.importOrdenes(req.file.path);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Import Transacciones
router.post('/transacciones', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const result = await ImportService.importTransacciones(req.file.path);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

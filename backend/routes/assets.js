const express = require("express");
const router = express.Router();
const passport = require('passport');
const Assets = require('../controllers/Asset');
const simpleAuth = require('../middleware/simpleAuth');



router.post('/upload-url', simpleAuth, Assets.getUploadUrl );
router.post('/confirm-upload', simpleAuth, Assets.confirmUpload );
router.get('/campaign/:campaignId', simpleAuth, Assets.getCampaignAssets);
router.get('/download/:id', simpleAuth, Assets.getDownloadUrl);



module.exports = router;

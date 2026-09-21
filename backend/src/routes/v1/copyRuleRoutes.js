const express = require('express');
const copyRuleController = require('../../controllers/copyRuleController');
const authenticate = require('../../middleware/authMiddleware');
const validateRequest = require('../../middleware/validateRequest');
const { idParamValidator } = require('../../validators/traderValidators');

const router = express.Router();

router.use(authenticate);

router.post('/', copyRuleController.createRule);
router.get('/', copyRuleController.listRules);
router.get('/:id', idParamValidator, validateRequest, copyRuleController.getRuleById);
router.patch('/:id', idParamValidator, validateRequest, copyRuleController.updateRule);
router.patch('/:id/toggle', idParamValidator, validateRequest, copyRuleController.toggleRule);
router.delete('/:id', idParamValidator, validateRequest, copyRuleController.deleteRule);

module.exports = router;

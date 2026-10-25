import { calculateUsage, saveUsageConfig, getUsageConfig, invalidateUsageCache } from '../services/usageService.js';

/**
 * Controller to retrieve 5-hour and weekly AI token usage & rate limits
 * GET /api/usage
 */
export async function getUsageHandler(req, res) {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const stats = await calculateUsage(forceRefresh);
    return res.json(stats);
  } catch (error) {
    console.error('[UsageController Error] getUsageHandler failed:', error);
    return res.status(500).json({
      error: 'Error al calcular cuota de uso.',
      details: error.message
    });
  }
}

/**
 * Controller to update quota limits and configuration (Admin only)
 * POST /api/usage/config
 */
export async function updateUsageConfigHandler(req, res) {
  try {
    const { limit5h, limitWeekly, countCache, mode } = req.body;
    const updated = saveUsageConfig({
      limit5h,
      limitWeekly,
      countCache,
      mode
    });
    const stats = await calculateUsage(true);
    return res.json({
      success: true,
      message: 'Configuración de cuota actualizada exitosamente.',
      config: updated,
      stats
    });
  } catch (error) {
    console.error('[UsageController Error] updateUsageConfigHandler failed:', error);
    return res.status(500).json({
      error: 'Error al actualizar configuración de cuota.',
      details: error.message
    });
  }
}

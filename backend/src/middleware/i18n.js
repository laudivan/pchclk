const translations = {
  'en-US': {
    welcome: 'Welcome to PchClk API',
    health_ok: 'System is healthy',
    device_authorized: 'Device paired successfully',
    invalid_code: 'Invalid or expired authorization code',
    punch_success: 'Punch clocked successfully',
    unauthorized: 'Unauthorized access',
    db_error: 'Database error occurred',
    route_not_found: 'Route not found'
  },
  'pt-BR': {
    welcome: 'Bem-vindo à API PchClk',
    health_ok: 'Sistema operando normalmente',
    device_authorized: 'Dispositivo pareado com sucesso',
    invalid_code: 'Código de autorização inválido ou expirado',
    punch_success: 'Ponto registrado com sucesso',
    unauthorized: 'Acesso não autorizado',
    db_error: 'Ocorreu um erro no banco de dados',
    route_not_found: 'Rota não encontrada'
  }
};

export const i18n = (req, res, next) => {
  // Parse Accept-Language header (default to pt-BR for Northeast Brazil users)
  const header = req.headers['accept-language'] || 'pt-BR';
  let locale = 'pt-BR';

  if (header.includes('en') || header.includes('en-US')) {
    locale = 'en-US';
  }

  // Attach translation helper
  res.t = (key) => {
    return translations[locale][key] || key;
  };

  res.locale = locale;
  next();
};

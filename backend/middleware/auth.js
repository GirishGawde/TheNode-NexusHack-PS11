import { supabase } from '../config/supabase.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ 
      success: false, error: 'No token provided',
      code: 'NO_TOKEN'
    });
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) return res.status(401).json({ 
      success: false, error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
    
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    req.user = profile;
    next();
  } catch (err) {
    console.error('[authMiddleware] error:', err);
    res.status(500).json({ 
      success: false, error: 'Auth error' 
    });
  }
};

export const organiserOnly = (req, res, next) => {
  if (req.user?.role !== 'organiser') {
    return res.status(403).json({ 
      success: false, error: 'Organiser access required',
      code: 'FORBIDDEN'
    });
  }
  next();
};

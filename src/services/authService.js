import { supabase } from '../config/supabase';

export const authService = {
  /**
   * User Registration
   */
  async signUp({ email, password, fullName, phone, roleName = 'USER' }) {
    try {
      // 1. Get role_id
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('role_id')
        .eq('role_name', roleName)
        .single();

      if (roleError) throw new Error(`Role lookup error: ${roleError.message}`);

      // 2. Insert into users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
          {
            full_name: fullName,
            email: email,
            phone: phone,
            password_hash: password, // In production, hash using bcrypt/supabase auth
            role_id: roleData.role_id,
            status: 'ACTIVE',
          },
        ])
        .select()
        .single();

      if (userError) throw userError;

      // 3. If STAFF role, create staff profile automatically
      if (roleName === 'STAFF') {
        await supabase.from('staff_profiles').insert([
          {
            user_id: userData.user_id,
            job_title: 'Gate Attendant',
            shift: 'MORNING',
            employment_status: 'Active',
          },
        ]);
      }

      return { success: true, user: userData };
    } catch (error) {
      console.error('SignUp Error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * User Login with Email & Password
   */
  async signIn({ email, password }) {
    try {
      // 1.2s timeout race to prevent network hang latency
      const queryPromise = supabase
        .from('users')
        .select(`
          user_id,
          full_name,
          email,
          phone,
          status,
          role_id,
          roles (
            role_name
          )
        `)
        .eq('email', email)
        .single();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network timeout - using fast authentication fallback')), 1200)
      );

      const { data: user, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error || !user) {
        throw new Error('User not found or invalid credentials.');
      }

      // Return user details with attached role string ('ADMIN', 'STAFF', 'USER')
      return {
        success: true,
        user: {
          id: user.user_id,
          name: user.full_name,
          email: user.email,
          phone: user.phone,
          role: user.roles?.role_name || 'USER',
        },
      };
    } catch (error) {
      console.warn('SignIn Notice:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get User Profile with Role
   */
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          roles (role_name),
          staff_profiles (*)
        `)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

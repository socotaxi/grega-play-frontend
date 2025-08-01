import supabase from '../lib/supabaseClient';

const notificationService = {
  /**
   * Create a new notification
   * @param {Object} notification - The notification data
   * @returns {Promise<Object>} - The created notification
   */
  async createNotification(notification) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type || 'info',
          read: false,
          link: notification.link || null,
        },
      ])
      .select();

    if (error) {
      console.error('Error creating notification:', error);
      throw new Error(error.message);
    }

    return data[0];
  },

  /**
   * Get notifications for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} - The user's notifications
   */
  async getUserNotifications(userId) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      throw new Error(error.message);
    }

    return data;
  },

  /**
   * Mark a notification as read
   * @param {string} notificationId - The notification ID
   * @returns {Promise<Object>} - The updated notification
   */
  async markAsRead(notificationId) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .select();

    if (error) {
      console.error('Error marking notification as read:', error);
      throw new Error(error.message);
    }

    return data[0];
  },

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - The user ID
   * @returns {Promise<void>}
   */
  async markAllAsRead(userId) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error(error.message);
    }
  },

  /**
   * Notify participants about an event
   * @param {string} eventId - The event ID
   * @param {string} message - The notification message
   * @returns {Promise<void>}
   */
  async notifyEventParticipants(eventId, message) {
    // 1. Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('user_id')
      .eq('event_id', eventId);

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      throw new Error(participantsError.message);
    }

    // 2. Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
      throw new Error(eventError.message);
    }

    // 3. Create notifications for each participant
    const notifications = participants.map(participant => ({
      user_id: participant.user_id,
      title: `Événement: ${event.title}`,
      message,
      type: 'event',
      link: `/events/${eventId}`,
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) {
      console.error('Error creating notifications:', error);
      throw new Error(error.message);
    }
  }
};

export default notificationService;
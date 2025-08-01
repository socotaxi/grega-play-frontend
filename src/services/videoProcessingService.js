import supabase from '../lib/supabaseClient';

const videoProcessingService = {
  /**
   * Trigger video processing for an event
   * @param {string} eventId - The event ID
   * @returns {Promise<Object>} - The processing job
   */
  async triggerVideoProcessing(eventId) {
    // 1. Update event status to 'processing'
    const { error: updateError } = await supabase
      .from('events')
      .update({ status: 'processing' })
      .eq('id', eventId);

    if (updateError) {
      console.error('Error updating event status:', updateError);
      throw new Error(updateError.message);
    }

    // 2. Call serverless function to start processing
    try {
      // Retrieve the current session to get the auth token
      const { data, error: sessionError } = await supabase.auth.getSession();
      const token = data?.session?.access_token;

      if (sessionError || !token) {
        console.error('Missing Supabase session:', sessionError);
        throw new Error('User is not authenticated');
      }

      const API_BASE_URL =
  import.meta.env.MODE === 'development'
    ? 'http://localhost:4000'
    : ''; // laisse vide en production si tu utilises le même domaine
    
      const response = await fetch(`/api/process-video?eventId=${eventId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to start video processing');
      }

      return await response.json();
    } catch (error) {
      console.error('Error triggering video processing:', error);
      
      // Revert status on error
      await supabase
        .from('events')
        .update({ status: 'ready' })
        .eq('id', eventId);
        
      throw new Error('Failed to start video processing');
    }
  },

  /**
   * Check processing status
   * @param {string} eventId - The event ID
   * @returns {Promise<string>} - The processing status
   */
  async checkProcessingStatus(eventId) {
    const { data, error } = await supabase
      .from('events')
      .select('status')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error('Error checking processing status:', error);
      throw new Error(error.message);
    }

    return data.status;
  },

  /**
   * Set the final video URL for an event
   * @param {string} eventId - The event ID
   * @param {string} videoUrl - The video URL
   * @returns {Promise<Object>} - The updated event
   */
  async setFinalVideoUrl(eventId, videoUrl) {
    const { data, error } = await supabase
      .from('events')
      .update({ 
        final_video_url: videoUrl,
        status: 'done'
      })
      .eq('id', eventId)
      .select();

    if (error) {
      console.error('Error setting final video URL:', error);
      throw new Error(error.message);
    }

    return data[0];
  },

  /**
   * Check if all event videos are valid for processing
   * @param {string} eventId - The event ID
   * @returns {Promise<boolean>} - Whether all videos are valid
   */
  async validateEventVideos(eventId) {
    const { data, error } = await supabase
      .from('videos')
      .select('status')
      .eq('event_id', eventId);

    if (error) {
      console.error('Error validating event videos:', error);
      throw new Error(error.message);
    }

    // Check if all videos are validated
    const invalidVideos = data.filter(video => video.status !== 'validated');
    return invalidVideos.length === 0;
  }
};

export default videoProcessingService;
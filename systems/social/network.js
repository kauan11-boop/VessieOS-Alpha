/**
 * VessieOS Social Network System
 * Complete social network with posts, likes, comments, and user profiles
 */

class SocialNetworkSystem {
  constructor(config = {}) {
    this.users = new Map();
    this.posts = [];
    this.comments = new Map();
    this.followers = new Map();
    this.likes = new Map();
    this.notifications = [];
    this.storage = config.storage || 'localStorage';
    this.maxPostLength = 500;
    this.maxCommentLength = 250;
    this.eventLog = [];
  }

  /**
   * Create user account
   */
  createUser(userData) {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const user = {
      id: userId,
      username: userData.username,
      email: userData.email,
      avatar: userData.avatar || this.generateAvatar(userData.username),
      bio: userData.bio || '',
      followers: [],
      following: [],
      posts: [],
      createdAt: new Date().toISOString()
    };

    this.users.set(userId, user);
    this.followers.set(userId, []);
    this.log(`✓ User created: ${userData.username}`);

    return user;
  }

  /**
   * Get user by ID or username
   */
  getUser(identifier) {
    // Try by ID
    if (this.users.has(identifier)) {
      return this.users.get(identifier);
    }

    // Try by username
    for (const user of this.users.values()) {
      if (user.username === identifier) {
        return user;
      }
    }

    return null;
  }

  /**
   * Create post
   */
  createPost(userId, content, data = {}) {
    const user = this.getUser(userId);
    if (!user) throw new Error('User not found');
    if (content.length > this.maxPostLength) throw new Error('Post too long');

    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const post = {
      id: postId,
      authorId: userId,
      author: user.username,
      avatar: user.avatar,
      content,
      media: data.media || [],
      likes: 0,
      comments: [],
      shares: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: data.isPublic !== false
    };

    this.posts.unshift(post); // Add to beginning
    user.posts.push(postId);
    this.likes.set(postId, []);
    this.comments.set(postId, []);

    this.notifyFollowers(userId, `${user.username} posted something new`);
    this.log(`✓ Post created: ${postId}`);

    return post;
  }

  /**
   * Like/unlike post
   */
  toggleLike(userId, postId) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) throw new Error('Post not found');

    const likes = this.likes.get(postId) || [];
    const hasLiked = likes.includes(userId);

    if (hasLiked) {
      likes.splice(likes.indexOf(userId), 1);
      post.likes--;
    } else {
      likes.push(userId);
      post.likes++;
      
      // Notify author
      this.createNotification(post.authorId, `Someone liked your post`);
    }

    this.log(`${hasLiked ? '✗' : '✓'} Like toggled on post ${postId}`);
    return !hasLiked;
  }

  /**
   * Comment on post
   */
  addComment(userId, postId, content) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) throw new Error('Post not found');
    if (content.length > this.maxCommentLength) throw new Error('Comment too long');

    const user = this.getUser(userId);
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const comment = {
      id: commentId,
      authorId: userId,
      author: user.username,
      avatar: user.avatar,
      content,
      likes: 0,
      createdAt: new Date().toISOString()
    };

    const postComments = this.comments.get(postId) || [];
    postComments.push(comment);
    this.comments.set(postId, postComments);

    post.comments.push(commentId);

    // Notify post author
    this.createNotification(post.authorId, `${user.username} commented on your post`);

    this.log(`✓ Comment added to post ${postId}`);
    return comment;
  }

  /**
   * Follow user
   */
  followUser(followerId, followingId) {
    const follower = this.getUser(followerId);
    const following = this.getUser(followingId);

    if (!follower || !following) throw new Error('User not found');
    if (followerId === followingId) throw new Error('Cannot follow yourself');

    if (!follower.following.includes(followingId)) {
      follower.following.push(followingId);
      following.followers.push(followerId);

      this.createNotification(followingId, `${follower.username} is now following you`);
      this.log(`✓ ${follower.username} now follows ${following.username}`);

      return true;
    }

    return false;
  }

  /**
   * Unfollow user
   */
  unfollowUser(followerId, followingId) {
    const follower = this.getUser(followerId);
    const following = this.getUser(followingId);

    if (!follower || !following) throw new Error('User not found');

    if (follower.following.includes(followingId)) {
      follower.following.splice(follower.following.indexOf(followingId), 1);
      following.followers.splice(following.followers.indexOf(followerId), 1);

      this.log(`✓ ${follower.username} unfollowed ${following.username}`);
      return true;
    }

    return false;
  }

  /**
   * Get user feed (posts from following)
   */
  getUserFeed(userId, limit = 20) {
    const user = this.getUser(userId);
    if (!user) throw new Error('User not found');

    const feed = this.posts.filter(post => {
      // Own posts
      if (post.authorId === userId) return true;
      // Posts from following
      if (user.following.includes(post.authorId)) return true;
      // Public posts from followers (trending)
      return false;
    });

    return feed.slice(0, limit);
  }

  /**
   * Get user timeline (own posts)
   */
  getUserTimeline(userId, limit = 20) {
    const user = this.getUser(userId);
    if (!user) throw new Error('User not found');

    const timeline = this.posts.filter(post => post.authorId === userId);
    return timeline.slice(0, limit);
  }

  /**
   * Create notification
   */
  createNotification(userId, message) {
    const notification = {
      id: `notif_${Date.now()}`,
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString()
    };

    this.notifications.push(notification);
    
    document.dispatchEvent(new CustomEvent('social-notification', {
      detail: notification
    }));

    return notification;
  }

  /**
   * Notify followers
   */
  notifyFollowers(userId, message) {
    const user = this.getUser(userId);
    
    for (const followerId of user.followers) {
      this.createNotification(followerId, message);
    }
  }

  /**
   * Get notifications
   */
  getNotifications(userId) {
    return this.notifications.filter(n => n.userId === userId);
  }

  /**
   * Mark notification as read
   */
  markNotificationAsRead(notificationId) {
    const notif = this.notifications.find(n => n.id === notificationId);
    if (notif) {
      notif.read = true;
    }
  }

  /**
   * Search posts
   */
  searchPosts(query, limit = 20) {
    return this.posts.filter(post => {
      const content = post.content.toLowerCase();
      const author = post.author.toLowerCase();
      const q = query.toLowerCase();

      return content.includes(q) || author.includes(q);
    }).slice(0, limit);
  }

  /**
   * Get trending posts
   */
  getTrendingPosts(limit = 10) {
    return [...this.posts]
      .sort((a, b) => {
        const scoreA = a.likes * 3 + a.comments.length * 2;
        const scoreB = b.likes * 3 + b.comments.length * 2;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  /**
   * Generate random avatar
   */
  generateAvatar(username) {
    const colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8'];
    const color = colors[username.length % colors.length];
    const initials = username.split(' ').map(n => n[0]).join('').toUpperCase();

    // via.placeholder.com foi descontinuado em 2023; ui-avatars.com é
    // gratuito, ativo e não exige chave de API
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=FFFFFF&size=150&bold=true`;
  }

  /**
   * Update user profile
   */
  updateUserProfile(userId, updates) {
    const user = this.getUser(userId);
    if (!user) throw new Error('User not found');

    Object.assign(user, {
      username: updates.username || user.username,
      bio: updates.bio || user.bio,
      avatar: updates.avatar || user.avatar
    });

    this.log(`✓ Profile updated: ${user.username}`);
    return user;
  }

  /**
   * Get user stats
   */
  getUserStats(userId) {
    const user = this.getUser(userId);
    if (!user) throw new Error('User not found');

    const userPosts = this.posts.filter(p => p.authorId === userId);
    const totalLikes = userPosts.reduce((sum, p) => sum + p.likes, 0);
    const totalComments = userPosts.reduce((sum, p) => sum + p.comments.length, 0);

    return {
      userId,
      posts: user.posts.length,
      followers: user.followers.length,
      following: user.following.length,
      totalLikes,
      totalComments,
      joinedAt: user.createdAt
    };
  }

  /**
   * Export user data
   */
  exportUserData(userId) {
    const user = this.getUser(userId);
    if (!user) throw new Error('User not found');

    const userData = {
      user,
      posts: this.posts.filter(p => p.authorId === userId),
      notifications: this.notifications.filter(n => n.userId === userId),
      stats: this.getUserStats(userId)
    };

    return userData;
  }

  /**
   * Get system stats
   */
  getSystemStats() {
    return {
      totalUsers: this.users.size,
      totalPosts: this.posts.length,
      totalComments: Array.from(this.comments.values()).reduce((sum, c) => sum + c.length, 0),
      totalNotifications: this.notifications.length,
      avgPostsPerUser: this.users.size > 0 ? this.posts.length / this.users.size : 0
    };
  }

  /**
   * Logging
   */
  log(message) {
    const entry = {
      timestamp: new Date().toISOString(),
      message
    };
    this.eventLog.push(entry);
    console.log(`[Social] ${message}`);
  }

  /**
   * Get log
   */
  getLog(limit = 50) {
    return this.eventLog.slice(-limit);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SocialNetworkSystem;
}

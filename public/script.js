// Giveaway Tracker JavaScript

let giveaways = [];
let currentFilter = 'all';
let currentActionGiveaway = null;
let currentActionType = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadGiveaways();
    setupEventListeners();
    updateStats();
});

// Setup event listeners
function setupEventListeners() {
    // Filter tabs
    document.querySelectorAll('[data-filter]').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const filter = this.getAttribute('data-filter');
            setActiveFilter(filter);
        });
    });

    // Form submission
    document.getElementById('addGiveawayForm').addEventListener('submit', function(e) {
        e.preventDefault();
        addGiveaway();
    });
}

// Set active filter and update display
function setActiveFilter(filter) {
    currentFilter = filter;
    
    // Update tab appearance
    document.querySelectorAll('[data-filter]').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    // Filter and display giveaways
    displayGiveaways();
}

// Load giveaways from server
async function loadGiveaways() {
    try {
        const response = await fetch('/api/giveaways');
        giveaways = await response.json();
        displayGiveaways();
        updateStats();
    } catch (error) {
        console.error('Error loading giveaways:', error);
        showNotification('Error loading giveaways', 'error');
    }
}

// Display filtered giveaways
function displayGiveaways() {
    const container = document.getElementById('giveawaysList');
    const filteredGiveaways = filterGiveaways(giveaways, currentFilter);
    
    if (filteredGiveaways.length === 0) {
        container.innerHTML = getEmptyStateHTML();
        return;
    }
    
    container.innerHTML = filteredGiveaways.map(giveaway => createGiveawayHTML(giveaway)).join('');
}

// Filter giveaways based on current filter
function filterGiveaways(giveaways, filter) {
    const now = new Date();
    
    switch (filter) {
        case 'active':
            return giveaways.filter(g => g.status === 'active' && new Date(g.deadline) > now);
        case 'completed':
            return giveaways.filter(g => g.entry_completed);
        case 'ending-soon':
            const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            return giveaways.filter(g => 
                g.status === 'active' && 
                new Date(g.deadline) <= oneDayFromNow && 
                new Date(g.deadline) > now
            );
        default:
            return giveaways;
    }
}

// Create HTML for a single giveaway
function createGiveawayHTML(giveaway) {
    const timeRemaining = getTimeRemaining(giveaway.deadline);
    const progress = calculateProgress(giveaway);
    const requirements = getRequirements(giveaway);
    
    return `
        <div class="card giveaway-card ${giveaway.entry_completed ? 'completed' : ''} ${timeRemaining.isUrgent ? 'ending-soon' : ''}">
            <div class="card-body">
                <div class="giveaway-header">
                    <div>
                        <h5 class="giveaway-title">${giveaway.title}</h5>
                        <p class="giveaway-author">by ${giveaway.author || 'Unknown'}</p>
                    </div>
                    <div>
                        <span class="platform-badge">${giveaway.platform}</span>
                        <span class="badge status-badge ${giveaway.entry_completed ? 'bg-success' : 'bg-primary'}">
                            ${giveaway.entry_completed ? 'Completed' : 'Active'}
                        </span>
                    </div>
                </div>
                
                ${giveaway.prize ? `
                    <div class="prize-info">
                        <i class="fas fa-gift"></i>
                        <strong>Prize:</strong> ${giveaway.prize}
                    </div>
                ` : ''}
                
                <div class="deadline-info">
                    <i class="fas fa-clock"></i>
                    <span class="time-remaining ${timeRemaining.class}">
                        ${timeRemaining.text}
                    </span>
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <small class="text-muted">${Math.round(progress)}% completed</small>
                
                <div class="requirements-grid mt-3">
                    ${requirements.map(req => `
                        <div class="requirement-item ${req.completed ? 'completed' : 'pending'}">
                            <i class="${req.icon}"></i>
                            <span class="requirement-text">${req.text}</span>
                            ${!req.completed ? `
                                <button class="action-button" onclick="openActionModal(${giveaway.id}, '${req.type}', '${req.text}')">
                                    <i class="fas fa-check"></i>
                                </button>
                            ` : `
                                <i class="fas fa-check-circle text-success"></i>
                            `}
                        </div>
                    `).join('')}
                </div>
                
                ${giveaway.requirements ? `
                    <div class="mt-3">
                        <small class="text-muted">
                            <strong>Additional requirements:</strong> ${giveaway.requirements}
                        </small>
                    </div>
                ` : ''}
                
                <div class="giveaway-actions">
                    <div>
                        ${giveaway.post_url ? `
                            <a href="${giveaway.post_url}" target="_blank" class="btn btn-outline-primary btn-sm">
                                <i class="fas fa-external-link-alt"></i> View Post
                            </a>
                        ` : ''}
                    </div>
                    <div>
                        <button class="btn btn-outline-secondary btn-sm" onclick="updateGiveawayStatus(${giveaway.id}, 'won')">
                            <i class="fas fa-trophy"></i> Won
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteGiveaway(${giveaway.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Get time remaining information
function getTimeRemaining(deadline) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    
    if (diff <= 0) {
        return { text: 'Expired', class: 'urgent', isUrgent: true };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 1) {
        return { text: `${days} days remaining`, class: 'safe', isUrgent: false };
    } else if (days === 1) {
        return { text: `1 day, ${hours} hours remaining`, class: 'warning', isUrgent: false };
    } else if (hours > 0) {
        return { text: `${hours} hours, ${minutes} minutes remaining`, class: 'urgent', isUrgent: true };
    } else {
        return { text: `${minutes} minutes remaining`, class: 'urgent', isUrgent: true };
    }
}

// Calculate completion progress
function calculateProgress(giveaway) {
    const totalRequirements = [
        giveaway.follow_required,
        giveaway.like_required,
        giveaway.comment_required,
        giveaway.share_required,
        giveaway.tag_required
    ].filter(Boolean).length;
    
    if (totalRequirements === 0) return 100;
    
    return (giveaway.completed_actions / totalRequirements) * 100;
}

// Get requirements array
function getRequirements(giveaway) {
    const requirements = [];
    
    if (giveaway.follow_required) {
        requirements.push({
            type: 'follow',
            text: 'Follow Page',
            icon: 'fas fa-user-plus',
            completed: hasCompletedAction(giveaway.id, 'follow')
        });
    }
    
    if (giveaway.like_required) {
        requirements.push({
            type: 'like',
            text: 'Like Post',
            icon: 'fas fa-heart',
            completed: hasCompletedAction(giveaway.id, 'like')
        });
    }
    
    if (giveaway.comment_required) {
        requirements.push({
            type: 'comment',
            text: 'Comment',
            icon: 'fas fa-comment',
            completed: hasCompletedAction(giveaway.id, 'comment')
        });
    }
    
    if (giveaway.share_required) {
        requirements.push({
            type: 'share',
            text: 'Share Post',
            icon: 'fas fa-share',
            completed: hasCompletedAction(giveaway.id, 'share')
        });
    }
    
    if (giveaway.tag_required) {
        requirements.push({
            type: 'tag',
            text: 'Tag Friends',
            icon: 'fas fa-at',
            completed: hasCompletedAction(giveaway.id, 'tag')
        });
    }
    
    return requirements;
}

// Check if action is completed (simplified - would need actual tracking)
function hasCompletedAction(giveawayId, actionType) {
    // This is a simplified check - in a real app, you'd track completed actions
    const giveaway = giveaways.find(g => g.id === giveawayId);
    return giveaway && giveaway.completed_actions > 0; // Simplified logic
}

// Get empty state HTML
function getEmptyStateHTML() {
    const messages = {
        'all': 'No giveaways found. Add your first giveaway to get started!',
        'active': 'No active giveaways. Add some giveaways to track!',
        'completed': 'No completed entries yet. Complete some requirements to see them here!',
        'ending-soon': 'No giveaways ending soon. Great! You have time to complete your entries.'
    };
    
    return `
        <div class="empty-state">
            <i class="fas fa-gift"></i>
            <h4>No Giveaways Found</h4>
            <p>${messages[currentFilter]}</p>
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addGiveawayModal">
                <i class="fas fa-plus"></i> Add Giveaway
            </button>
        </div>
    `;
}

// Add new giveaway
async function addGiveaway() {
    const form = document.getElementById('addGiveawayForm');
    const formData = new FormData(form);
    
    const giveawayData = {
        title: document.getElementById('title').value,
        author: document.getElementById('author').value,
        platform: document.getElementById('platform').value,
        post_url: document.getElementById('post_url').value,
        requirements: document.getElementById('requirements').value,
        deadline: document.getElementById('deadline').value,
        prize: document.getElementById('prize').value,
        follow_required: document.getElementById('follow_required').checked,
        like_required: document.getElementById('like_required').checked,
        comment_required: document.getElementById('comment_required').checked,
        share_required: document.getElementById('share_required').checked,
        tag_required: document.getElementById('tag_required').checked
    };
    
    try {
        const response = await fetch('/api/giveaways', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(giveawayData)
        });
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('addGiveawayModal'));
            modal.hide();
            form.reset();
            loadGiveaways();
            showNotification('Giveaway added successfully!', 'success');
        } else {
            showNotification('Error adding giveaway', 'error');
        }
    } catch (error) {
        console.error('Error adding giveaway:', error);
        showNotification('Error adding giveaway', 'error');
    }
}

// Open action completion modal
function openActionModal(giveawayId, actionType, actionText) {
    currentActionGiveaway = giveawayId;
    currentActionType = actionType;
    
    document.getElementById('actionDescription').textContent = 
        `Mark "${actionText}" as completed for this giveaway.`;
    
    const modal = new bootstrap.Modal(document.getElementById('actionModal'));
    modal.show();
}

// Complete an action
async function completeAction() {
    const notes = document.getElementById('actionNotes').value;
    
    try {
        const response = await fetch(`/api/giveaways/${currentActionGiveaway}/complete-action`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action_type: currentActionType,
                notes: notes
            })
        });
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('actionModal'));
            modal.hide();
            document.getElementById('actionNotes').value = '';
            loadGiveaways();
            showNotification('Action marked as completed!', 'success');
        } else {
            showNotification('Error completing action', 'error');
        }
    } catch (error) {
        console.error('Error completing action:', error);
        showNotification('Error completing action', 'error');
    }
}

// Update giveaway status
async function updateGiveawayStatus(id, status) {
    try {
        const response = await fetch(`/api/giveaways/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            loadGiveaways();
            showNotification('Status updated successfully!', 'success');
        } else {
            showNotification('Error updating status', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Error updating status', 'error');
    }
}

// Delete giveaway
async function deleteGiveaway(id) {
    if (!confirm('Are you sure you want to delete this giveaway?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/giveaways/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadGiveaways();
            showNotification('Giveaway deleted successfully!', 'success');
        } else {
            showNotification('Error deleting giveaway', 'error');
        }
    } catch (error) {
        console.error('Error deleting giveaway:', error);
        showNotification('Error deleting giveaway', 'error');
    }
}

// Update statistics
function updateStats() {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const activeCount = giveaways.filter(g => 
        g.status === 'active' && new Date(g.deadline) > now
    ).length;
    
    const completedCount = giveaways.filter(g => g.entry_completed).length;
    
    const endingSoonCount = giveaways.filter(g => 
        g.status === 'active' && 
        new Date(g.deadline) <= oneDayFromNow && 
        new Date(g.deadline) > now
    ).length;
    
    const totalPrizes = giveaways.length;
    
    document.getElementById('activeCount').textContent = activeCount;
    document.getElementById('completedCount').textContent = completedCount;
    document.getElementById('endingSoonCount').textContent = endingSoonCount;
    document.getElementById('totalPrizes').textContent = totalPrizes;
}

// Show notification
function showNotification(message, type) {
    // Simple notification - you could enhance this with a proper notification library
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}




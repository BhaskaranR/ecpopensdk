class Launcher {
    constructor(config = {}) {
      this.config = {
        newMessagesCount: 0,
        showEmoji: true,
        ...config
      };
  
      this.state = {
        launcherIcon: './assets/logo-no-bg.svg',
        isOpen: false
      };
  
      this.element = this.render();
      this.bindEvents();
    }
  
    playIncomingMessageSound() {
      const audio = new Audio('./assets/sounds/notification.mp3');
      audio.play();
    }
  
    handleClick() {
      if (this.config.handleClick) {
        this.config.handleClick();
      } else {
        this.state.isOpen = !this.state.isOpen;
        this.updateView();
      }
    }
  
    createMessageCount() {
      if (this.config.newMessagesCount === 0 || this.isOpen) {
        return null;
      }
      const messageCount = document.createElement('div');
      messageCount.className = 'sc-new-messages-count';
      messageCount.textContent = String(this.config.newMessagesCount);
      return messageCount;
    }
  
    get isOpen() {
      return this.config.hasOwnProperty('isOpen') ? 
        this.config.isOpen : 
        this.state.isOpen;
    }
  
    render() {
      // Create main container
      const launcher = document.createElement('div');
      launcher.id = 'sc-launcher';
  
      // Create launcher button
      const launcherButton = document.createElement('div');
      launcherButton.className = `sc-launcher ${this.isOpen ? 'opened' : ''}`;
  
      // Create icons
      const openIcon = document.createElement('img');
      openIcon.className = 'sc-open-icon';
      openIcon.src = './assets/close-icon.png';
  
      const closedIcon = document.createElement('img');
      closedIcon.className = 'sc-closed-icon';
      closedIcon.src = this.state.launcherIcon;
  
      // Create chat window
      const chatWindow = document.createElement('div');
      chatWindow.className = `sc-chat-window ${this.isOpen ? 'opened' : 'closed'}`;
  
      // Create header
      const header = document.createElement('div');
      header.className = 'sc-header';
  
      const headerImg = document.createElement('img');
      headerImg.className = 'sc-header--img';
      headerImg.src = this.config.imageUrl || '';
      headerImg.alt = '';
  
      const teamName = document.createElement('div');
      teamName.className = 'sc-header--team-name';
      teamName.textContent = this.config.teamName || '';
  
      const closeButton = document.createElement('div');
      closeButton.className = 'sc-header--close-button';
      
      const closeImg = document.createElement('img');
      closeImg.src = './assets/close-icon.png';
      closeImg.alt = '';
      
      // Assemble the components
      closeButton.appendChild(closeImg);
      header.appendChild(headerImg);
      header.appendChild(teamName);
      header.appendChild(closeButton);
      chatWindow.appendChild(header);
  
      // Add symphony frames container
      const framesContainer = document.createElement('div');
      framesContainer.id = 'symphony-frames-container';
      
      const mainFrameContainer = document.createElement('div');
      mainFrameContainer.id = 'symphony-main-frame-container';
      
      framesContainer.appendChild(mainFrameContainer);
      chatWindow.appendChild(framesContainer);
  
      const messageCount = this.createMessageCount();
      if (messageCount) {
        launcherButton.appendChild(messageCount);
      }
      
      launcherButton.appendChild(openIcon);
      launcherButton.appendChild(closedIcon);
      
      launcher.appendChild(launcherButton);
      launcher.appendChild(chatWindow);
  
      return launcher;
    }
  
    bindEvents() {
      const launcherButton = this.element.querySelector('.sc-launcher');
      const closeButton = this.element.querySelector('.sc-header--close-button');
  
      if (launcherButton) {
        launcherButton.addEventListener('click', () => this.handleClick());
      }
      if (closeButton) {
        closeButton.addEventListener('click', () => this.handleClick());
      }
    }
  
    updateView() {
      const launcherButton = this.element.querySelector('.sc-launcher');
      const chatWindow = this.element.querySelector('.sc-chat-window');
      
      if (launcherButton) {
        launcherButton.className = `sc-launcher ${this.isOpen ? 'opened' : ''}`;
      }
      if (chatWindow) {
        chatWindow.className = `sc-chat-window ${this.isOpen ? 'opened' : 'closed'}`;
      }
  
      // Update message count
      const existingCount = this.element.querySelector('.sc-new-messages-count');
      if (existingCount) {
        existingCount.remove();
      }
      
      const newCount = this.createMessageCount();
      if (newCount && launcherButton) {
        launcherButton.insertBefore(newCount, launcherButton.firstChild);
      }
    }
  
    updateMessageList(newMessageList) {
      if (this.config.mute) {
        return;
      }
  
      const nextMessage = newMessageList[newMessageList.length - 1];
      const isIncoming = (nextMessage || {}).author === 'them';
      const isNew = newMessageList.length > (this.config.messageList || []).length;
  
      if (isIncoming && isNew) {
        this.playIncomingMessageSound();
      }
  
      this.config.messageList = newMessageList;
    }
  
    mount(container) {
      container.appendChild(this.element);
    }
  }
  
  export default Launcher;

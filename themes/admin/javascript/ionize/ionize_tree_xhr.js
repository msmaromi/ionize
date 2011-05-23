/**
 *  Ionize Tree class
 *  Build each website structure tree
 * 
 *  @author	Partikule Studio
 *  @since	0.9.5
 * 
 */
ION.TreeXhr = new Class({

	Implements: [Events, Options],
	
	options: ION.options,
	
	initialize: function(container, id_menu, options)
	{
		this.setOptions(options);
		this.container = $(container);
		this.id_menu = id_menu;
		
		this.mainpanel = ION.mainpanel;

		// Array of itemManagers
		this.itemManagers = {'page': new Array(), 'article': new Array()};
		
		var opened = new Array();
		if (Cookie.read('tree')) opened = (Cookie.read('tree')).split(',');
		
		this.elementIcon_Model = new Element('div', {'class': 'tree-img drag'});
		this.plusMinus_Model = new Element('div', {'class': 'tree-img plus'});
		this.lineNode_Model = new Element('div', {'class': 'tree-img line node'});
		this.treeLine_Model = new Element('div', {'class': 'tree-img'});
		
		this.folderLi_Model = new Element('li', {'class': 'folder page'});
		this.fileLi_Model = new Element('li', {'class': 'file doc'});
		this.action_Model = new Element('span', {'class': 'action', 'styles': { 'display':'none' }});
		this.icon_Model = new Element('span', {'class': 'icon'});
		this.span_Model = new Element('span');
		this.title_Model = new Element('a', {'class': 'title'});
		
		this.opened = new Array();
		if (Cookie.read('tree')) this.opened = (Cookie.read('tree')).split(',');

		this.get(0);
	},

	
	/**
	 * Gets one tree
	 *
	 */
	get: function(id_parent)
	{
		var self = this;
		
		// Get childs pages and articles
		new Request.JSON({
			url: admin_url + 'tree/get', 
			method: 'post',
			loadMethod: 'xhr',
			data: {
				'id_menu': this.id_menu,
				'id_parent': id_parent
			},
			onFailure: function(xhr) 
			{
				ION.notification('error', xhr.responseJSON);
			},
			onSuccess: function(responseJSON, responseText)
			{
				var pages = responseJSON.pages;
				var articles = responseJSON.articles;

				var pageContainer = self.injectContainer('page', id_parent, true);
				var articleContainer = self.injectContainer('article', id_parent, true);
				
				
				// Build tree
				pages.each(function(page) {
					self.insertElement(page, 'page');
				});
				
				articles.each(function(article)
				{
					self.insertElement(article, 'article');
				});
				
				var parentContainer = self.getParentContainer(id_parent);

				// Stores that the content is loaded
				parentContainer.store('loaded', true);
		
				// Opens the folder
				if (id_parent != 0)
					self.updateOpenClose(parentContainer);
			}
		}).send();
	},


	/**
	 * Inject or return an existing container for elements (page or articles)
	 *
	 */
	injectContainer: function(type, id_parent, erase)
	{
		var parentContainer = this.getParentContainer(id_parent);

		var container = parentContainer.getFirst('ul.' + type + 'Container');

		if (typeOf(container) == 'null')
		{
			container = new Element('ul', {'rel': id_parent});				
			
			// Root class
			if (id_parent == '0')
			{
				container.addClass('tree');
				container.id = type + 'ContainerTree' + this.id_menu;
			}
			else
			{
				container.id = type + 'Container' + id_parent;
			}
			container.addClass(type + 'Container').inject(parentContainer, 'bottom');
			
			// Hide the parentContainer if it should be, but not for the root.
			if (id_parent != 0)
				if ( ! (parentContainer.hasClass('f-open'))) { container.setStyle('display', 'none');}
		}
		else
		{
			if (erase == true)
			{
				container.empty();
				if (typeOf(this.itemManagers[type][container.id]) != 'null')
					delete this.itemManagers[type][container.id];
			}

		}

		return container;
	},
	
	
	/**
	 * Inserts one element (page / article) in a container (UL)
	 *
	 */
	insertElement: function(element, type)
	{
		// Inject or get the container

		var self = this;
		var id = (type == 'page') ? element.id_page : element.id_article;
		var id_parent = (type == 'page') ? element.id_parent : element.id_page;
		
		var flat_id = (type == 'page') ? element.id_page : element.id_page + 'x' + element.id_article;
		var rel = (type == 'page') ? element.id_page : element.id_page + '.' + element.id_article;
		var online = (element.online == '1') ? 'online' : 'offline'; 
		var title = (element.title !='') ? element.title : element.name;
		
		var container = this.injectContainer(type, id_parent)

		var li = new Element('li').setProperty('id', type + '_' + flat_id).addClass(online).addClass(type + flat_id).setProperty('rel', rel);
		li.store('loaded', false);
		li.store('id_' + type, id);
		
		// Action element
		var action = this.action_Model.clone();
		var iconOnline = this.icon_Model.clone().adopt(new Element('a').addClass('status').addClass(online).addClass(type + flat_id).setProperty('rel', rel));
		action.adopt(iconOnline);
		
		// Title element 
		var link = this.span_Model.clone().addClass('title');
		var a = this.title_Model.clone().addClass(online).addClass(type + flat_id).addClass('title').setProperty('rel', rel).setProperty('title', title).set('text', String.htmlspecialchars_decode(title));
		link.adopt(a);
		li.adopt(action, link);
		this.addEditLink(li, type);
		
		// Icon
		var icon = this.elementIcon_Model.clone();
		icon.inject(li, 'top');
		
		// Page
		if (type == 'page')
		{
			li.addClass('folder').addClass('page');
			
			// Icon : Add Article
			action.adopt(this.icon_Model.clone().adopt(new Element('a').addClass('addArticle').addClass('article').setProperty('rel', rel)));
			
			// Actions
			this.addPageActionLinks(action);

			// Folder icon
			icon.addClass('folder');

			// if home page, remove home from the old home page
			if (element.home == '1')
			{
				$$('.folder.home').removeClass('home');
				icon.addClass('home');
			}
			
			// plus / minus icon
			var pm = this.plusMinus_Model.clone().addEvent('click', this.openclose.bind(this)).inject(li, 'top');

			// Make the title draggable : Move page
			ION.addDragDrop(a, '.dropPageAsLink,.dropPageInArticle', 'ION.dropPageAsLink,ION.dropPageInArticle');
		}
		// Article
		else
		{
			li.addClass('file').addClass(type + id);
			
			// Icon : unlink
			var iconUnlink = this.icon_Model.clone().adopt(new Element('a', {'class': 'unlink', 'rel': rel}));
			action.adopt(iconUnlink);

			// Actions
			this.addArticleActionLinks(action);
			
			// File icon
			if (element.indexed == '0') icon.addClass('sticky');
			else icon.addClass('file');

			// Flag span : Type first, then user's flag
			var flag = (element.type_flag != '') ? element.type_flag : element.flag;
			var span = new Element('span', {'class':'flag flag' + flag});
			span.inject(a, 'top');
			if ((flag != '' || flag!='0') && Browser.ie7) a.setStyle('padding-left','6px');
			
			// Item node line
			this.treeLine_Model.clone().inject(li, 'top').addClass('line').addClass('node');

			// Make the article name draggable
			ION.addDragDrop(a, '.folder,.dropArticleAsLink,.dropArticleInPage', 'ION.dropArticleInPage,ION.dropArticleAsLink,ION.dropArticleInPage');
		}
		
		li.inject(container, 'bottom');

		// Get the parent : Build tree lines (nodes)
		li.getParents('li').each(function(parent){
			self.treeLine_Model.clone().inject(li, 'top');
		});

		// Makes the folder sortable (on folder icon)
		if (typeOf(container.retrieve('sortables')) != 'null')
			(container.retrieve('sortables')).addItems(li);
		else
		{
			if (type == 'page')	this.itemManagers[type][container.id] = new ION.PageManager({'container': container.id });
			else if (type == 'article') this.itemManagers[type][container.id] = new ION.ArticleManager({ 'container': container.id , 'id_parent': id_parent});
		}
		
		// Mouse over effect : Show / Hide actions
		this.addMouseOver(li);
		
		// Open the foldr if cookie says...
		if (type == 'page' && this.opened.contains(id))
		{
			this.get(id);
		}
	},
	
	
	/**
	 * Plus / Minus folder icon click event	
	 *
	 */
	openclose:function(e)
	{
		if (typeOf(e.stop) == 'function') e.stop();
		el = e.target;
		
		// Folder (LI)
		var folder = el.getParent();
		
		// Update content : XHR
		if (folder.retrieve('loaded') == false)
			this.get(folder.retrieve('id_page'));
		else
			this.updateOpenClose(folder);
	},
	
	
	/**
	 * Displays / Hides content, updates Plus / Minus icons
	 *
	 *
	 */
	updateOpenClose: function(folder)
	{
		// All childrens UL
		var folderContents = folder.getChildren('ul');
		var folderIcon = folder.getChildren('div.folder');
		
		// Is the folder Open ? Yes ? Close it (Hide the content)
		if (folder.hasClass('f-open'))
		{
			var pmIcon = folder.getFirst('div.tree-img.minus');
			pmIcon.addClass('plus').removeClass('minus');
			
			folderIcon.removeClass('open');
			folderContents.each(function(ul){ ul.setStyle('display', 'none');});
			folder.removeClass('f-open');
			
			ION.treeDelFromCookie(folder.retrieve('id_page'));
		}
		else
		{
			var pmIcon = folder.getFirst('div.tree-img.plus');
			pmIcon.addClass('minus').removeClass('plus');
		
			folderIcon.addClass('open');
			folderContents.each(function(ul){ ul.setStyle('display', 'block'); });
			folder.addClass('f-open');
			
			ION.treeAddToCookie(folder.retrieve('id_page'));
			
			$('btnStructureExpand').store('status', 'expand');
			$('btnStructureExpand').value = Lang.get('ionize_label_collapse_all');
		}
	},

	/**
	 * Adds a link to a tree LI DOM element
	 *
	 * @param	DOMElement		tree LI
	 * @param	String			logical tree element type. "page" or "article"
	 *
	 */
	addEditLink: function(el, type)
	{
		var a = el.getElement('a.title');
		var rel = (a.getProperty('rel')).split(".");
		var id = rel[0];
		
		// id is the last rel
		if (rel.length > 1) { id = rel[1]; }

		var p = $(this.mainpanel);

		a.addEvent('click', function(e)
		{
			e.stop();
			
			MUI.Content.update({
				'element': p,
				'url': admin_url + type + '/edit/' + a.getProperty('rel'),
				'title': Lang.get('ionize_title_edit_' + type) + ' : ' + a.get('text')	
			});
		});
	},


	getParentContainer: function(id_parent)
	{
		// Parent DOM Element (usually a folder LI)
		var parentEl = 'page_' + id_parent;

		if (typeOf($(parentEl)) == 'null')
			parentEl = this.container;
		else
			parentEl = $(parentEl);
			
		return parentEl;
	},



/**
 * 
 *
 * HERE : Replace switchOnline() and deleteItem() by the ION one
 *
 *
 *
 *
 */	
	addPageActionLinks: function(el)
	{
		var a = el.getElement('a.addArticle');
		var id = a.rel;
		var p = $(this.mainpanel);
		
		// Add article icon
		a.addEvent('click', function(e)
		{
			e.stop();
			MUI.Content.update({
				'element': p,
				'url': admin_url + 'article/create/' + id,
				'title': Lang.get('ionize_title_create_article')
			});
		});
		
		// Online / Offline icon
		a = el.getElement('a.status');
		ION.initPageStatusEvent(el.getElement('a.status'));
	},

	
	addArticleActionLinks: function(el)
	{
		// Add the Status Event
		ION.initArticleStatusEvent(el.getElement('a.status'));

		// Unlink Event
		ION.initArticleUnlinkEvent(el.getElement('a.unlink'));
	},

	
	addMouseOver: function(node)
	{
		node.addEvent('mouseover', function(ev){
			ev.stopPropagation();
			ev.stop();
			this.addClass('highlight');
			this.getParent().getParent().getChildren('.action').setStyle('display', 'none');
			this.getChildren('.action').setStyle('display', 'block');
		});
		node.addEvent('mouseout', function(ev){
			this.removeClass('highlight');
		});
		node.addEvent('mouseleave', function(e)
		{
			this.getChildren('.action').setStyle('display', 'none');
		});
	}
});


ION.append({


	/**
	 * Add tree element to cookie
	 *
	 */
	treeAddToCookie: function(value)
	{
		var opened = Array();
		if (Cookie.read('tree'))
			opened = (Cookie.read('tree')).split(',');
		if (!opened.contains(value))
		{
			opened.push(value);
			Cookie.write('tree', opened.join(','));
		}
	},

	
	/**
	 * Remove tree elements from cookie
	 *
	 */
	treeDelFromCookie: function(value)
	{
		var opened = Array();
		if (Cookie.read('tree'))
			opened = (Cookie.read('tree')).split(',');
		if (opened.contains(value))
		{
			opened.erase(value);
			Cookie.write('tree', opened.join(','));
		}
	}
	
});
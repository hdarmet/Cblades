"use strict"

import {
    getDrawPlatform
} from "../board/draw.js";

/**
 * Base class for component. These objects are DOM handlers, not subclasses of DOM objects. The DOM object managed by
 * component is referenced by the _root attribute. This DOM object "knows" its element counterpart thanks to a
 * _component attribute added to it. This "back" reference is useful to find the corresponding element when a user
 * event is received by the DOM object
 */
export class DComponent {
    /**
     * Element constructor. This method also creates the corresponding DOM object.
     * @param domType type of the DOM object : DIV, A, LI, etc;
     */
    constructor(domType) {
        this._domType = domType;
        this._root = getDrawPlatform().createElement(domType);
        this._root._component = this;
    }
    /**
     * Retrieves the parent component of this component.
     * It traverses up the DOM tree until it finds a node that has a _component attribute,
     * indicating it's a component managed by this system.
     *
     * @returns {DComponent|null} The parent component, or null if no parent component is found.
     */
    getParent() {
        let parentNode = this._root.parentNode;
        // Traverse up the DOM tree until a component is found or the root is reached.
        while (parentNode !== null && (parentNode._component === null || parentNode._component === undefined)) {
            parentNode = parentNode.parentNode;
        }
        // If parentNode is null, no component was found; otherwise, return the component.
        return parentNode===null ? parentNode : parentNode._component;
    }

    /**
     * Adds a style attribute to the component's root DOM element.
     * It also stores the style in an internal map for quick access.
     *
     * @param {string} name The name of the style attribute (e.g., "width", "color").
     * @param {string} value The value of the style attribute (e.g., "100px", "red").
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    addStyle(name, value) {
        if (!this._styles) {
            this._styles = new Map();
        }
        this._styles.set(name, value);
        getDrawPlatform().setStyleAttribute(this._root, name, value);
        return this;
    }

    /**
     * Retrieves the value of a specific style attribute.
     *
     * @param {string} style The name of the style attribute to retrieve.
     * @returns {string|null} The value of the style attribute, or null if not found.
     */
    getStyle(style) {
        return this._styles ? this._styles.get(style) : null;
    }

    /**
     * Sets an attribute on the component's root DOM element.
     * It also stores the attribute in an internal map.
     *
     * @param {string} name The name of the attribute (e.g., "id", "class").
     * @param {string} value The value of the attribute.
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    setAttribute(name, value) {
        if (!this._attributes) {
            this._attributes = new Map();
        }
        this._attributes.set(name, value);
        getDrawPlatform().setAttribute(this._root, name, value);
        return this;
    }

    /**
     * Removes an attribute from the component's root DOM element.
     * It also removes the attribute from the internal map.
     *
     * @param {string} name The name of the attribute to remove.
     * @param {string} value The value of the attribute to remove.
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    removeAttribute(name, value) {
        if (this._attributes) {
            this._attributes.delete(name, value);
            getDrawPlatform().removeAttribute(this._root, name);
        }
        return this;
    }

    /**
     * Retrieves the value of a specific attribute.
     *
     * @param {string} attribute The name of the attribute to retrieve.
     * @returns {string|null} The value of the attribute, or null if not found.
     */
    getAttribute(attribute) {
        return this._attributes ? this._attributes.get(attribute) : null;
    }

    /**
     * Sets the width style attribute.
     *
     * @param {string} width The width value (e.g., "100px", "50%").
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    setWidth(width) {
        return this.addStyle("width", width);
    }

    /**
     * Retrieves the width style attribute.
     *
     * @returns {string|null} The width value, or null if not set.
     */
    getWidth() {
        return this.getStyle("width");
    }

    /**
     * Sets the height style attribute.
     *
     * @param {string} height The height value (e.g., "100px", "50%").
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    setHeight(height) {
        return this.addStyle("height", height);
    }

    /**
     * Retrieves the height style attribute.
     *
     * @returns {string|null} The height value, or null if not set.
     */
    getHeight() {
        return this.getStyle("height");
    }

    /**
     * Sets the border style attribute.
     *
     * @param {string} border The border value (e.g., "1px solid black").
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    setBorder(border) {
        return this.addStyle("border", border);
    }

    /**
     * Retrieves the border style attribute.
     *
     * @returns {string|null} The border value, or null if not set.
     */
    getBorder() {
        return this.getStyle("border");
    }

    /**
     * Sets the background-color style attribute.
     *
     * @param {string} color The color value (e.g., "red", "#FF0000").
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    setColor(color) {
        return this.addStyle("background-color", color);
    }

    /**
     * Retrieves the background-color style attribute.
     *
     * @returns {string|null} The color value, or null if not set.
     */
    getColor() {
        return this.getStyle("background-color");
    }

    /**
     * Sets the float style attribute.
     *
     * @param {string} float The float value (e.g., "left", "right").
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    setFloating(float) {
        return this.addStyle("float", float);
    }

    /**
     * Retrieves the float style attribute.
     *
     * @returns {string|null} The float value, or null if not set.
     */
    getFloating() {
        return this.getStyle("float");
    }

    /**
     * Sets the overflow style attribute.
     *
     * @param {string} overflow The overflow value (e.g., "hidden", "scroll").
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    setOverflow(overflow) {
        return this.addStyle("overflow", overflow);
    }

    /**
     * Retrieves the overflow style attribute.
     *
     * @returns {string|null} The overflow value, or null if not set.
     */
    getOverflow() {
        return this.getStyle("overflow");
    }

    /**
     * Checks if the component has a specific CSS class.
     *
     * @param {string} clazz The CSS class to check for.
     * @returns {boolean} True if the component has the class, false otherwise.
     */
    containsClass(clazz) {
        return this._classes.indexOf(clazz)>=0;
    }

    /**
     * Adds a CSS class to the component.
     *
     * @param {string} clazz The CSS class to add.
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    addClass(clazz) {
        if (!this._classes) {
            this._classes = [];
        }
        if (this._classes.indexOf(clazz)<0) {
            this._classes.push(clazz);
            getDrawPlatform().setAttribute(this._root, "class", this._classes.join(" "));
        }
        return this;
    }

    /**
     * Removes a CSS class from the component.
     *
     * @param {string} clazz The CSS class to remove.
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    removeClass(clazz) {
        if (this._classes && this._classes.remove(clazz)>=0) {
            getDrawPlatform().setAttribute(this._root, "class", this._classes.join(" "));
        }
        return this;
    }

    /**
     * Retrieves all CSS classes of the component.
     *
     * @returns {string[]} An array of CSS classes.
     */
    getClasses() {
        return this._classes;
    }

    /**
     * Sets the text content of the component.
     *
     * @param {string} text The text content to set.
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    setText(text) {
        getDrawPlatform().setText(this._root, text);
        return this;
    }

    /**
     * Retrieves the text content of the component.
     *
     * @returns {string} The text content.
     */
    getText() {
        return getDrawPlatform().getText(this._root);
    }

    /**
     * Retrieves the inner HTML of the component's root element.
     *
     * @returns {string} The inner HTML.
     */
    getInnerHTML() {
        return getDrawPlatform().getText(this._root);
    }

    /**
     * Sets the 'alt' attribute of the component.
     *
     * @param {string} alt The 'alt' attribute value.
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    setAlt(alt) {
        this.setAttribute("alt", alt);
        return this;
    }

    /**
     * Retrieves the 'alt' attribute of the component.
     *
     * @returns {string|null} The 'alt' attribute value, or null if not set.
     */
    getAlt() {
        return this.getAttribute("alt");
    }

    /**
     * Sets the 'id' attribute of the component.
     *
     * @param {string} id The 'id' attribute value.
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    setId(id) {
        this.setAttribute("id", id);
        return this;
    }

    /**
     * Retrieves the 'id' attribute of the component.
     *
     * @returns {string|null} The 'id' attribute value, or null if not set.
     */
    getId() {
        return this.getAttribute("id");
    }

    /**
     * Sets the 'type' attribute of the component.
     *
     * @param {string} type The 'type' attribute value.
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    setType(type) {
        this.setAttribute("type", type);
        return this;
    }

    /**
     * Retrieves the 'type' attribute of the component.
     *
     * @returns {string|null} The 'type' attribute value, or null if not set.
     */
    getType() {
        return this.getAttribute("type");
    }

    /**
     * Sets the 'name' attribute of the component.
     *
     * @param {string} name The 'name' attribute value.
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    setName(name) {
        this.setAttribute("name", name);
        return this;
    }

    /**
     * Retrieves the 'name' attribute of the component.
     *
     * @returns {string|null} The 'name' attribute value, or null if not set.
     */
    getName() {
        return this.getAttribute("name");
    }

    /**
     * Gets the offsetWidth of the root DOM element.
     *
     * @returns {number} The offsetWidth.
     */
    get offsetWidth() {
        return this._root.offsetWidth;
    }

    /**
     * Gets the offsetHeight of the root DOM element.
     *
     * @returns {number} The offsetHeight.
     */
    get offsetHeight() {
        return this._root.offsetHeight;
    }

    /**
     * Gets the offsetTop of the root DOM element.
     *
     * @returns {number} The offsetTop.
     */
    get offsetTop() {
        return this._root.offsetTop;
    }

    /**
     * Gets the offsetLeft of the root DOM element.
     *
     * @returns {number} The offsetLeft.
     */
    get offsetLeft() {
        return this._root.offsetLeft;
    }

    /**
     * Gets the root DOM element of the component.
     *
     * @returns {HTMLElement} The root DOM element.
     */
    get root() {
        return this._root;
    }

    /**
     * Attaches an event listener to the component's root DOM element.
     * It also handles removing existing listeners for the same event.
     *
     * @param {string} event The event name (e.g., "click", "change").
     * @param {function} action The event handler function.
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    onEvent(event, action) {
        // Remove existing listener if it exists.
        if (this["_"+event]) {
            getDrawPlatform().removeEventListener(this._root, event, this["_"+event]);
            delete this["_"+event];
        }
        // Add new listener if an action is provided.
        if (action) {
            this["_"+event] = action;
            getDrawPlatform().addEventListener(this._root, event, action, false);
        }
        return this;
    }

    /**
     * Attaches a 'change' event listener.
     *
     * @param {function} changeAction The change event handler function.
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    onChange(changeAction) {
        return this.onEvent("change", changeAction);
    }

    /**
     * Attaches an 'input' event listener.
     *
     * @param {function} inputAction The input event handler function.
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    onInput(inputAction) {
        return this.onEvent("input", inputAction);
    }

    /**
     * Attaches a 'click' event listener.
     *
     * @param {function} clickAction The click event handler function.
     * @returns {DComponent} Returns the component itself for method chaining.
     */
    onMouseClick(clickAction) {
        return this.onEvent("click", clickAction);
    }}

/**
 * Checks if a given object is a DComponent or a subclass of DComponent.
 *
 * This function determines if an object is a component by checking for the
 * presence of the `_domType` property. If the property exists, it indicates
 * that the object is a component managed by the system.
 *
 * @param {any} any The object to check.
 * @returns {boolean} True if the object is a component, false otherwise.
 */
export function isComponent(any) {
    return any._domType !== undefined;
}

/**
 * DComposed is a base class for components that can contain other components.
 * It extends DComponent and provides methods for managing child components.
 */
export class DComposed extends DComponent {

    /**
     * Constructor for DComposed.
     * @param {string} domType - The type of the DOM element to create (e.g., "div", "ul").
     */
    constructor(domType) {
        super(domType);
        /**
         * @type {DComponent[]} _children - An array to hold the child components.
         * @private
         */
        this._children = null;
    }

    /**
     * Returns the DOM element that should be used as the anchor for appending child components.
     *
     * In most cases, this is simply the component's root element (`this._root`). However,
     * subclasses might override this method to specify a different anchor point for children.
     * For example, a component representing a table might want to append children to the
     * `<tbody>` element instead of the `<table>` element itself.
     *
     * @returns {HTMLElement} The DOM element to which child components should be appended.
     * @protected
     */
    _childrenAnchor() {
        return this._root;
    }

    /**
     * Adds a child component to this component.
     *
     * @param {DComponent} component - The component to add as a child.
     * @returns {DComposed} Returns the DComposed instance for method chaining.
     */
    add(component) {
        if (!this._children) {
            this._children = [];
        }
        this._children.push(component);
        getDrawPlatform().appendChild(this._childrenAnchor(), component._root);
        // Call the _added method of the child component if it exists.
        component._added && component._added();
        return this;
    }

    /**
     * Inserts a component before another component within this component's children.
     *
     * @param {DComponent} component - The component to insert.
     * @param {DComponent} before - The component before which to insert the new component.
     * @throws {Error} Throws an error if the 'before' component is not found in the children.
     * @returns {DComposed} Returns the DComposed instance for method chaining.
     */
    insert(component, before) {
        console.assert(this._children);
        if (this._children) {
            // Find the index of the 'before' component.
            let index = this._children.indexOf(before);
            console.assert(index >= 0);
            if (index >= 0) {
                // Insert the new component at the specified index.
                this._children.splice(index, 0, component);
                getDrawPlatform().insertBefore(this._root, component._root, before._root);
                // Call the _added method of the inserted component if it exists.
                component._added && component._added();
            }
        }
    }

    /**
     * Removes a child component from this component.
     *
     * @param {DComponent} component - The component to remove.
     * @returns {DComposed} Returns the DComposed instance for method chaining.
     */
    remove(component) {
        console.assert(this._children);
        if (this._children) {
            // Remove the component from the children array.
            if (this._children.remove(component) >= 0) {
                getDrawPlatform().removeChild(this._root, component._root);
                // Call the _removed method of the removed component if it exists.
                component._removed && component._removed();
            }
        }
    }

    /**
     * Removes all child components from this component.
     */
    clear() {
        let children = this._children;
        delete this._children;
        getDrawPlatform().replaceChildren(this._root);
        if (children) {
            for (let component of children) {
                component._removed && component._removed();
            }
        }
    }

    /**
     * Checks if this component contains a specific child component.
     *
     * @param {DComponent} child - The child component to check for.
     * @returns {boolean} True if the component contains the child, false otherwise.
     */
    contains(child) {
        return this._children && this._children.indexOf(child) >= 0;
    }

    /**
     * Gets the array of child components.
     *
     * @returns {DComponent[]} An array of child components.
     */
    get children() {
        return this._children ? this._children : [];
    }

    /**
     * Called when this component is added to another component.
     * It recursively calls the _added method of all child components.
     * @private
     */
    _added() {
        if (this._children) {
            for (let component of this._children) {
                component._added && component._added();
            }
        }
    }

    /**
     * Called when this component is removed from another component.
     * It recursively calls the _removed method of all child components.
     * @private
     */
    _removed() {
        if (this._children) {
            for (let component of this._children) {
                component._removed && component._removed();
            }
        }
    }

}

/**
 * A class represents an anchor (<a>) HTML element, which is a type of hyperlink.
 * It extends DComposed, allowing it to contain other components within the link.
 */
export class A extends DComposed {

    /**
     * Constructor for the A class.
     *
     * @param {string} text - The text content of the link.
     * @param {string} [href] - The URL that the link points to. This is optional.
     */
    constructor(text, href) {
        // Call the constructor of the parent class (DComposed) with the tag name "a".
        super("a");
        // If an href is provided, set it as an attribute of the root element.
        if (href) this.setAttribute("href", href);
        // Set the text content of the link.
        this.setText(text);
    }

    /**
     * Retrieves the href attribute of the link.
     *
     * @returns {string|null} The href value, or null if not set.
     */
    getHref() {
        return this.getAttribute("href");
    }

    /**
     * Sets the href attribute of the link.
     *
     * @param {string} href - The URL that the link should point to.
     * @returns {A} Returns the A instance for method chaining.
     */
    setHref(href) {
        this.setAttribute("href", href);
        return this;
    }

}

/**
 * LI class represents a list item (<li>) HTML element.
 * It extends DComposed, allowing it to contain other components within the list item.
 * LI components are typically used as children of UL (unordered list) or OL (ordered list) components.
 */
export class LI extends DComposed {

    /**
     * Constructor for the LI class.
     *
     * @param {string} [text] - The text content of the list item. This is optional.
     */
    constructor(text) {
        // Call the constructor of the parent class (DComposed) with the tag name "li".
        super("li");
        // If text is provided, set it as the text content of the list item.
        text && this.setText(text);
    }

}

/**
 * UL class represents an unordered list (<ul>) HTML element.
 * It extends DComposed, allowing it to contain other components,
 * specifically LI (list item) components, within the unordered list.
 */
export class UL extends DComposed {

    /**
     * Constructor for the UL class.
     * Initializes an unordered list element.
     */
    constructor() {
        // Call the constructor of the parent class (DComposed) with the tag name "ul".
        super("ul");
    }

    /**
     * Adds a child component to this unordered list.
     *
     * @param {DComponent} child - The component to add as a child.
     * @returns {UL} Returns the UL instance for method chaining.
     * @throws {Error} Throws an error if the child is not an instance of LI.
     */
    add(child) {
        // Assert that the child is an instance of LI.
        console.assert(child instanceof LI);
        // Call the add method of the parent class (DComposed) to add the child.
        return super.add(child);
    }
}

/**
 * OL class represents an ordered list (<ol>) HTML element.
 * It extends DComposed, allowing it to contain other components,
 * specifically LI (list item) components, within the ordered list.
 */
export class OL extends DComposed {
    /**
     * Constructor for the OL class.
     * Initializes an ordered list element.
     */
    constructor() {
        // Call the constructor of the parent class (DComposed) with the tag name "ol".
        super("ol");
    }

    /**
     * Adds a child component to this ordered list.
     *
     * @param {DComponent} child - The component to add as a child.
     * @returns {OL} Returns the OL instance for method chaining.
     * @throws {Error} Throws an error if the child is not an instance of LI.
     */
    add(child) {
        console.assert(child instanceof LI);
        return super.add(child);
    }
}

/**
 * Nav class represents a navigation (<nav>) HTML element.
 * It extends DComposed, allowing it to contain other components within the navigation section.
 */
export class Nav extends DComposed {

    /**
     * Constructor for the Nav class.
     * Initializes a navigation element.
     */
    constructor() {
        // Call the constructor of the parent class (DComposed) with the tag name "nav".
        super("nav");
    }

}

/**
 * Button class represents a button (<button>) HTML element.
 * It extends DComposed, allowing it to contain other components within the button.
 */
export class Button extends DComposed {

    /**
     * Constructor for the Button class.
     *
     * @param {string} text - The text content of the button.
     */
    constructor(text) {
        // Call the constructor of the parent class (DComposed) with the tag name "button".
        super("button");
        // Set the text content of the button.
        this.setText(text);
    }

}

/**
 * Div class represents a division (<div>) HTML element.
 * It extends DComposed, allowing it to contain other components within the division.
 */
export class Div extends DComposed {

    /**
     * Constructor for the Div class.
     *
     * @param {string} [text] - The text content of the division. This is optional.
     */
    constructor(text) {
        // Call the constructor of the parent class (DComposed) with the tag name "div".
        super("div");
        // If text is provided, set it as the text content of the division.
        if (text) this.setText(text);
    }

}
/**
 * Form class represents a form (<form>) HTML element.
 * It extends DComposed, allowing it to contain other components within the form.
 */
export class Form extends DComposed {

    /**
     * Constructor for the Form class.
     * Initializes a form element.
     */
    constructor() {
        // Call the constructor of the parent class (DComposed) with the tag name "form".
        super("form");
    }

}

/**
 * Label class represents a label (<label>) HTML element.
 * It extends DComposed, allowing it to contain other components within the label.
 */
export class Label extends DComposed {

    /**
     * Constructor for the Label class.
     *
     * @param {string} label - The text content of the label.
     */
    constructor(label) {
        // Call the constructor of the parent class (DComposed) with the tag name "label".
        super("label");
        // Set the text content of the label.
        this.setText(label);
    }

    /**
     * Sets the 'for' attribute of the label.
     *
     * @param {string} id - The 'id' of the element that the label is associated with.
     * @returns {Label} Returns the Label instance for method chaining.
     */
    setFor(id) {
        this.setAttribute("for", id);
        return this;
    }

    /**
     * Retrieves the 'for' attribute of the label.
     *
     * @returns {string|null} The 'for' attribute value, or null if not set.
     */
    getFor() {
        return this.getAttribute("for");
    }
}

/**
 * Span class represents a span (<span>) HTML element.
 * It extends DComposed, allowing it to contain other components within the span.
 */
export class Span extends DComposed {

    /**
     * Constructor for the Span class.
     *
     * @param {string} text - The text content of the span.
     */
    constructor(text) {
        // Call the constructor of the parent class (DComposed) with the tag name "span".
        super("span");
        // Set the text content of the span.
        this.setText(text);
    }

}

/**
 * P class represents a paragraph (<p>) HTML element.
 * It extends DComposed, allowing it to contain other components within the paragraph.
 */
export class P extends DComposed {

    /**
     * Constructor for the P class.
     *
     * @param {string} text - The text content of the paragraph.
     */
    constructor(text) {
        // Call the constructor of the parent class (DComposed) with the tag name "p".
        super("p");
        // Set the text content of the paragraph.
        this.setText(text);
    }

}

/**
 * Blockquote class represents a blockquote (<blockquote>) HTML element.
 * It extends DComposed, allowing it to contain other components within the blockquote.
 */
export class Blockquote extends DComposed {

    /**
     * Constructor for the Blockquote class.
     *
     * @param {string} innerHTML - The inner HTML content of the blockquote.
     */
    constructor(innerHTML) {
        // Call the constructor of the parent class (DComposed) with the tag name "blockquote".
        super("blockquote");
        // Set the inner HTML content of the blockquote.
        this.setText(innerHTML);
    }

}

/**
 * I class represents an italic (<i>) HTML element, often used for icons.
 * It extends DComposed, allowing it to contain other components within the italic element.
 */
export class I extends DComposed {

    /**
     * Constructor for the I class.
     *
     * @param {string} icon - The name of the icon to display (e.g., "home", "user").
     */
    constructor(icon) {
        // Call the constructor of the parent class (DComposed) with the tag name "i".
        super("i");
        // Add the Font Awesome classes for the specified icon.
        this.addClass("fa fa-" + icon);
    }

}

/**
 * TR class represents a table row (<tr>) HTML element.
 * It extends DComposed, allowing it to contain other components within the row.
 */
export class TR extends DComposed {

    /**
     * Constructor for the TR class.
     * Initializes a table row element.
     */
    constructor() {
        // Call the constructor of the parent class (DComposed) with the tag name "tr".
        super("tr");
    }

}

/**
 * Table class represents a table (<table>) HTML element.
 * It extends DComposed, allowing it to contain other components within the table.
 */
export class Table extends DComposed {

    /**
     * Constructor for the Table class.
     * Initializes a table element.
     */
    constructor() {
        // Call the constructor of the parent class (DComposed) with the tag name "table".
        super("table");
    }

}

/**
 * Thead class represents a table header (<thead>) HTML element.
 * It extends DComposed, allowing it to contain other components within the header.
 */
export class Thead extends DComposed {

    /**
     * Constructor for the Thead class.
     * Initializes a table header element.
     */
    constructor() {
        // Call the constructor of the parent class (DComposed) with the tag name "thead".
        super("thead");
    }

}

/**
 * TBody class represents a table body (<tbody>) HTML element.
 * It extends DComposed, allowing it to contain other components within the body.
 */
export class TBody extends DComposed {

    /**
     * Constructor for the TBody class.
     * Initializes a table body element.
     */
    constructor() {
        // Call the constructor of the parent class (DComposed) with the tag name "tbody".
        super("tbody");
    }

}

/**
 * TH class represents a table header cell (<th>) HTML element.
 * It extends DComposed, allowing it to contain other components within the header cell.
 */
export class TH extends DComposed {

    /**
     * Constructor for the TH class.
     *
     * @param {string} text - The text content of the header cell.
     */
    constructor(text) {
        // Call the constructor of the parent class (DComposed) with the tag name "th".
        super("th");
        // Set the text content of the header cell.
        this.setText(text);
    }

}

/**
 * TD class represents a table data cell (<td>) HTML element.
 * It extends DComposed, allowing it to contain other components within the data cell.
 */
export class TD extends DComposed {

    /**
     * Constructor for the TD class.
     *
     * @param {string} text - The text content of the data cell.
     */
    constructor(text) {
        // Call the constructor of the parent class (DComposed) with the tag name "td".
        super("td");
        // Set the text content of the data cell.
        this.setText(text);
    }

}

/**
 * InputMixin is a mixin that provides common functionality for components that handle user input.
 * It allows components to manage input events, track the current input value, and handle disabled state.
 */
export function InputMixin(clazz) {
    return class extends clazz {
        /**
         * Indicates if the component is an input component.
         * @returns {boolean} True if the component is an input, false otherwise.
         */
        get isInput() {
            return true;
        }

        /**
         * Retrieves the current value of the input.
         * @returns {string} The current value of the input.
         */
        getValue() {
            return this._root.value;
        }

        /**
         * Sets the current value of the input.
         * @param {string} value - The new value for the input.
         * @returns {this} Returns the instance for method chaining.
         */
        setValue(value) {
            this._root.value = value;
            return this;
        }

        /**
         * Retrieves the disabled state of the input.
         * @returns {boolean} True if the input is disabled, false otherwise.
         */
        getDisabled() {
            return this._root.getAttribute("disabled");
        }

        /**
         * Sets the disabled state of the input.
         * @param {boolean} disabled - True to disable the input, false to enable it.
         * @returns {this} Returns the instance for method chaining.
         */
        setDisabled(disabled) {
            if (disabled) {
                this._root.setAttribute("disabled", true);
            }
            else {
                this._root.removeAttribute("disabled");
            }
            return this;
        }

    }
}

/**
 * Option class represents an option (<option>) HTML element, typically used within a Select element.
 * It extends DComposed, allowing it to potentially contain other components (though this is less common for options).
 */
export class Option extends DComposed {

    /**
     * Constructor for the Option class.
     *
     * @param {string} value - The value attribute of the option. This is the value that will be submitted with the form.
     * @param {string} text - The text content of the option. This is the text that the user will see.
     */
    constructor(value, text) {
        // Call the constructor of the parent class (DComposed) with the tag name "option".
        super("option");
        // Set the value attribute of the option.
        this.setValue(value);
        // Set the text content of the option.
        this.setText(text);
    }

    /**
     * Retrieves the value attribute of the option.
     *
     * @returns {string|null} The value attribute, or null if not set.
     */
    getValue() {
        return this.getAttribute("value");
    }

    /**
     * Sets the value attribute of the option.
     *
     * @param {string} value - The new value for the option.
     * @returns {Option} Returns the Option instance for method chaining.
     */
    setValue(value) {
        this.setAttribute("value", value);
        return this;
    }

}

/**
 * Select class represents a select (<select>) HTML element.
 * It extends InputMixin(DComposed), allowing it to contain Option components and manage user input.
 */
export class Select extends InputMixin(DComposed) {

    /**
     * Constructor for the Select class.
     * Initializes a select element.
     */
    constructor() {
        // Call the constructor of the parent class (DComposed) with the tag name "select".
        super("select");
    }

    /**
     * Retrieves the options of the select element.
     *
     * @returns {{value: string, text: string}[]} An array of objects, each containing the value and text of an option.
     */
    getOptions() {
        let options = [];
        // Iterate over the child components (which should be Option instances).
        for (let option of this.children) {
            // Add an object with the value and text of each option to the array.
            options.push({value: option.getValue(), text: option.getText()});
        }
        return options;
    }

    /**
     * Sets the options of the select element.
     *
     * @param {{value: string, text: string}[]} options - An array of objects, each containing the value and text for an option.
     * @returns {Select} Returns the Select instance for method chaining.
     */
    setOptions(options) {
        // Iterate over the provided options.
        for (let line of options) {
            // Create a new Option instance for each option.
            let option = new Option(line.value, line.text).addClass("select-option");
            // Add the option to the select element.
            this.add(option);
        }
        return this;
    }

}

/**
 * Enum class represents a component that allows the user to select
 * a value from a predefined set of options.
 * It is essentially a labeled select element.
 * It extends Span, using it as a container for the label and the select element.
 */
export class Enum extends Span {

    /**
     * Constructor for the Enum class.
     *
     * @param {string} value - The current value of the enum.
     */
    constructor(value) {
        super();
        this._value = value;
    }

    /**
     * Retrieves the available options for the enum.
     *
     * @returns {{value: string, text: string}[]} An array of objects, each containing the value and text of an option.
     */
    getOptions() {
        let options = [];
        // Iterate over the options map and create an array of objects.
        for (let option of this._options.keys()) {
            options.push({value: option, text: this._options.get(option)});
        }
        return options;
    }


    /**
     * Sets the available options for the enum.
     *
     * @param {string[]} options - An array of strings representing the available options.
     * @returns {Enum} Returns the Enum instance for method chaining.
     */
    setOptions(options) {
        // Clear the existing options map.
        this._options = new Map();
        // Iterate over the provided options.
        for (let line of options) {
            // Add each option to the map, using the option as both the value and the text.
            this._options.set(line.value, line.text);
        }
        // If a value is already selected, update the displayed text.
        if (this._value) {
            this.setText(this._options.get(this._value));
        }
        return this;
    }

    /**
     * Retrieves the currently selected value of the enum.
     *
     * @returns {string|null} The currently selected value, or null if no value is selected.
     */
    getValue() {
        return this._value;
    }

    /**
     * Sets the currently selected value of the enum.
     *
     * @param {string} value - The new value to select.
     * @returns {Enum} Returns the Enum instance for method chaining.
     */
    setValue(value) {
        this._value = value;
        // If a value is selected, update the displayed text.
        if (this._value) {
            this.setText(this._options.get(this._value));
        }
        return this;
    }

}

/**
 * Input class represents an input (<input>) HTML element.
 * It extends InputMixin(DComposed), providing common input functionality and the ability to contain other components.
 */
export class Input extends InputMixin(DComposed) {

    /**
     * Constructor for the Input class.
     * Initializes an input element.
     */
    constructor() {
        // Call the constructor of the parent class (DComposed) with the tag name "input".
        super("input");
    }

    /**
     * Retrieves the checked state of the input.
     * This method is typically used for checkbox or radio input types.
     * @returns {boolean} True if the input is checked, false otherwise.
     */
    getChecked() {
        return this._root.checked;
    }

    /**
     * Sets the checked state of the input.
     * This method is typically used for checkbox or radio input types.
     * @param {boolean} checked - True to check the input, false to uncheck it.
     * @returns {this} Returns the Input instance for method chaining.
     */
    setChecked(checked) {
        this._root.checked = checked;
        return this;
    }
}

/**
 * Password class represents a password input (<input type="password">) HTML element.
 * It extends the Input class, inheriting common input functionality and specializing
 * it for password fields.
 */
export class Password extends Input {

    /**
     * Constructor for the Password class.
     * Initializes a password input element with the type set to "password".
     */
    constructor() {
        // Call the constructor of the parent class (Input).
        super();
        // Set the type attribute of the input element to "password".
        this.setType("password");
    }

}

/**
 * Checkbox class represents a checkbox input (<input type="checkbox">) HTML element.
 * It extends the Input class, inheriting common input functionality and specializing
 * it for checkbox fields.
 */
export class Checkbox extends Input {

    /**
     * Constructor for the Checkbox class.
     * Initializes a checkbox input element with the type set to "checkbox".
     */
    constructor() {
        // Call the constructor of the parent class (Input).
        super();
        // Set the type attribute of the input element to "checkbox".
        this.setType("checkbox");
    }

}

/**
 * Radio class represents a radio input (<input type="radio">) HTML element.
 * It extends the Input class, inheriting common input functionality and specializing
 * it for radio button fields.
 */
export class Radio extends Input {

    /**
     * Constructor for the Radio class.
     * Initializes a radio input element with the type set to "radio" and a specified name.
     *
     * @param {string} name - The name attribute for the radio button.
     *                         Radio buttons with the same name are considered part of the same group.
     */
    constructor(name) {
        // Call the constructor of the parent class (Input).
        super();
        // Set the type attribute of the input element to "radio".
        this.setType("radio");
        // Set the name attribute of the input element.
        this.setName(name);
    }

}

/**
 * TextArea class represents a textarea (<textarea>) HTML element.
 * It extends InputMixin(DComposed), providing common input functionality and the ability to contain other components.
 */
export class TextArea extends InputMixin(DComposed) {

    /**
     * Constructor for the TextArea class.
     * Initializes a textarea element.
     */
    constructor() {
        // Call the constructor of the parent class (DComposed) with the tag name "textarea".
        super("textarea");
    }

}

/**
 * Img class represents an image (<img>) HTML element.
 * It extends DComponent, providing basic component functionality.
 */
export class Img extends DComponent {

    /**
     * Constructor for the Img class.
     * Initializes an image element.
     *
     * @param {string} [imgSrc] - The source URL of the image. Optional.
     * @param {function} [onLoad] - A callback function to execute when the image has finished loading. Optional.
     */
    constructor(imgSrc, onLoad) {
        // Call the constructor of the parent class (DComponent) with the tag name "img".
        super("img");
        // If an image source is provided, set it.
        imgSrc&&this.setSrc(imgSrc);
        // Set up the native onload handler for the image element.
        // This handler iterates through static listeners and notifies them.
        this.root.onload = function(){
            // Iterate over all registered static loader listeners.
            for (let listener of Img._loaderListeners) {
                // Call the onImageLoaded method of each listener, passing the loaded image element.
                listener.onImageLoaded(this);
            }
        };
        // If an onLoad callback is provided, attach it as a 'load' event listener.
        onLoad && this.onEvent("load", onLoad);
    }

    /**
     * Retrieves the source URL (src attribute) of the image.
     *
     * @returns {string} The source URL of the image.
     */
    getSrc() {
        // Ensure the src attribute is not undefined before returning.
        console.assert(this._root.src !== undefined, "Image src undefined !!");
        return this._root.src;
    }

    /**
     * Sets the source URL (src attribute) of the image.
     * Optionally attaches a one-time 'load' event listener.
     *
     * @param {string} imgSrc - The new source URL for the image.
     * @param {function} [trigger] - An optional callback function to execute once when the image loads after setting the new source.
     * @returns {Img} Returns the Img instance for method chaining.
     */
    setSrc(imgSrc, trigger) {
        // Ensure a valid image source is provided.
        console.assert(imgSrc, "Image src undefined.")
        // Set the src attribute of the underlying DOM element.
        this._root.src = imgSrc;
        // If a trigger callback is provided, attach it as a 'load' event listener.
        trigger && this.onEvent("load", trigger);
        return this;
    }

    /**
     * Creates a Blob object containing the image data (as PNG).
     *
     * @param {string} fileName - The desired filename for the blob (used if converted to a File).
     * @param {number} [width=this._root.width] - The width to draw the image on the canvas. Defaults to the image's natural width.
     * @param {number} [height=this._root.height] - The height to draw the image on the canvas. Defaults to the image's natural height.
     * @returns {Blob} A Blob object containing the image data in PNG format.
     */
    getDataBlob(fileName, width = this._root.width, height = this._root.height) {
        // Create a temporary canvas element.
        let canvas = getDrawPlatform().createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        // Get the 2D rendering context for the canvas.
        let ctx = getDrawPlatform().getContext("2d");
        // Draw the image onto the canvas.
        getDrawPlatform().drawImage(ctx, this._root, 0, 0, width, height);
        // Convert the canvas content to a PNG data URL and then to a Blob.
        return dataURLtoBlob(getDrawPlatform().toDataURL(canvas, "image/png"));
    }

    /**
     * Creates an object URL representing the image data Blob.
     *
     * @param {string} fileName - The desired filename for the underlying blob.
     * @param {number} [width=this._root.width] - The width used when creating the blob. Defaults to the image's natural width.
     * @param {number} [height=this._root.height] - The height used when creating the blob. Defaults to the image's natural height.
     * @returns {string} An object URL representing the image data.
     */
    getDataURL(fileName, width = this._root.width, height = this._root.height) {
        // Create an object URL from the image data Blob.
        return getDrawPlatform().createObjectURL(this.getDataBlob(fileName, width, height));
    }

    /**
     * Creates a File object containing the image data.
     *
     * @param {string} fileName - The desired filename for the File object.
     * @param {number} [width=this._root.width] - The width used when creating the blob. Defaults to the image's natural width.
     * @param {number} [height=this._root.height] - The height used when creating the blob. Defaults to the image's natural height.
     * @returns {File} A File object containing the image data.
     */
    getFile(fileName, width = this._root.width, height = this._root.height) {
        // Create a File object from the image data Blob and the provided filename.
        return getDrawPlatform().createFile(this.getDataBlob(fileName, width, height), fileName);
    }

    /**
     * @type {Set<object>} _loaderListeners - A static set holding listeners interested in image load events globally.
     * @static
     * @private
     */
    static _loaderListeners = new Set();

    /**
     * Adds a listener object to the static set of image load listeners.
     * These listeners are notified via their `onImageLoaded` method whenever any Img instance finishes loading.
     *
     * @param {object} listener - The listener object (expected to have an `onImageLoaded` method).
     * @static
     */
    static addLoaderListener(listener) {
        Img._loaderListeners.add(listener);
    }

    /**
     * Removes a listener object from the static set of image load listeners.
     *
     * @param {object} listener - The listener object to remove.
     * @static
     */
    static removeLoaderListener(listener) {
        Img._loaderListeners.delete(listener);
    }

}

/**
 * App class represents the main application container.
 * It extends the Div class, providing a basic block-level element
 * to hold the application's content and structure.
 */
export class App extends Div {
}

/**
 * UndoRedo class provides a static mechanism for managing undo and redo functionality.
 * It allows components or modules to register as listeners and respond to undo/redo events,
 * typically triggered by keyboard shortcuts (Ctrl+Z, Ctrl+Y).
 * This class acts as a central dispatcher for these actions.
 */
export class UndoRedo {

    /**
     * @type {Array<object>} listeners - A static array holding listener objects.
     * Each listener object is expected to have optional `undo` and `redo` methods.
     * @static
     */
    static listeners = [];

    /**
     * @type {boolean} active - A static flag indicating if the UndoRedo system is active.
     * It becomes active when the first listener is added and inactive when the last one is removed.
     * This flag is used by the keyboard event listener to determine if it should intercept Ctrl+Z/Ctrl+Y.
     * @static
     * @private
     */
    static active; // Initially undefined

    /**
     * Adds a listener object to the list of undo/redo listeners.
     * Activates the UndoRedo system if it's not already active.
     *
     * @param {object} listener - The listener object to add. It should have `undo()` and/or `redo()` methods.
     * @static
     */
    static addListener(listener) {
        // Add the listener to the static array.
        UndoRedo.listeners.push(listener);
        // Activate the system if this is the first listener.
        if (!UndoRedo.active) {
            UndoRedo.active = true;
        }
    }

    /**
     * Removes a listener object from the list.
     * Deactivates the UndoRedo system if there are no listeners left.
     *
     * @param {object} listener - The listener object to remove.
     * @static
     */
    static removeListener(listener) {
        // Remove the listener from the array.
        // WARNING: .remove() is not a standard Array method.
        // Standard approach: UndoRedo.listeners = UndoRedo.listeners.filter(l => l !== listener);
        UndoRedo.listeners.remove(listener);
        // Deactivate the system if this was the last listener.
        if (!UndoRedo.listeners.length) {
            // Use delete to make 'active' undefined again, matching initial state.
            delete UndoRedo.active;
        }
    }

    /**
     * Emits an undo event to the most recently added listener that supports it.
     * It calls the `undo()` method on the last listener in the array if it exists.
     *
     * @static
     */
    static emitUndoEvent() {
        // Get the last listener added.
        let listener = UndoRedo.listeners.last();
        // If a listener exists and has an 'undo' method, call it.
        if (listener) {
            listener.undo && listener.undo();
        }
    }

    /**
     * Emits a redo event to all registered listeners that support it.
     * It iterates through all listeners and calls their `redo()` method if it exists.
     *
     * @static
     */
    static emitRedoEvent() {
        // Iterate through all registered listeners.
        for (let listener of UndoRedo.listeners) {
            // If the listener has a 'redo' method, call it.
            listener.redo && listener.redo();
        }
    }

}

/**
 * Sets up a global keyboard event listener on the document body
 * to capture Ctrl+Z (Undo) and Ctrl+Y (Redo) key combinations.
 */
export function addKeyboardEventListener() {
    /*
    // This commented-out block seems to be an earlier version or alternative
    // that only prevented the default action but didn't trigger the custom undo/redo.
    getDrawPlatform().addEventListener(
        getDrawPlatform().getDocument().body,
        'keydown',
        event => {
            if (event.ctrlKey) {
                if (event.key === 'z' && UndoRedo.active) {
                    event.preventDefault();
                    return false;
                } else if (event.key === 'y' && UndoRedo.active) {
                    event.preventDefault();
                    return false;
                }
            }
        }
    );
     */

    // Add the keydown event listener to the document body.
    getDrawPlatform().addEventListener(
        getDrawPlatform().getDocument().body, // Target the main body of the document
        'keydown', // Listen for the keydown event
        event => { // The event handler function
            // Check if the Ctrl key (or Cmd key on Mac) was pressed during the event.
            if (event.ctrlKey) {
                // Check if the pressed key was 'z' and if the UndoRedo system is active.
                if (event.key === 'z' && UndoRedo.active) {
                    // Prevent the browser's default undo action.
                    event.preventDefault();
                    // Emit the custom undo event through the UndoRedo manager.
                    UndoRedo.emitUndoEvent();
                    // Indicate that the event was handled (optional, might not have a significant effect here).
                    return true;
                    // Check if the pressed key was 'y' and if the UndoRedo system is active.
                } else if (event.key === 'y' && UndoRedo.active) {
                    // Prevent the browser's default redo action.
                    event.preventDefault();
                    // Emit the custom redo event through the UndoRedo manager.
                    UndoRedo.emitRedoEvent();
                    // Indicate that the event was handled.
                    return true;
                }
            }
        }
    );
}

// Immediately call the function to attach the listener when the script loads.
addKeyboardEventListener();

/**
 * Checks if a given File object represents an image.
 * It specifically checks for PNG and JPEG image types.
 *
 * @param {File} file - The File object to inspect. It's expected to have a `type` property (MIME type).
 * @returns {boolean} True if the file's MIME type is "image/png" or "image/jpeg", false otherwise.
 */
export function isImageFile(file) {
    // Check if the file's type property matches the MIME types for PNG or JPEG.
    return file.type === "image/png" || file.type === "image/jpeg";
}

/**
 * Checks if a given URL string likely points to an image based on its file extension.
 * It performs a case-sensitive check for common image extensions: png, jpeg, jpg.
 *
 * @param {string} url - The URL string to inspect.
 * @returns {boolean} True if the URL ends with ".png", ".jpeg", or ".jpg", false otherwise.
 */
export function isImageURL(url) {
    // Find the index of the last occurrence of a period (.) in the URL.
    let index = url.lastIndexOf(".");
    // Check if a period was found (index >= 0).
    if (index>=0) {
        // Extract the part of the string after the last period (potential file extension).
        let extension = url.substring(index+1);
        // Check if the extracted extension matches common image file extensions.
        return extension === "png" || extension === "jpeg" || extension === "jpg";
    }
    // If no period was found, assume it's not an image URL based on extension.
    return false;
}

export function requestLog(...params) {
    //console.log(...params);
}

// Check if String.format already exists to avoid overwriting a native or previously defined version.
if (!String.format) {
    /**
     * Formats a string by replacing placeholders with the given arguments.
     * Placeholders are in the format {index}, e.g., {0}, {1}.
     *
     * Example: String.format("Hello {0}, you are {1}!", "World", 25)
     *          // Returns: "Hello World, you are 25!"
     *
     * @param {string} format - The format string containing placeholders.
     * @param {...any} args - The values to insert into the placeholders.
     * @returns {string} The formatted string.
     */
    String.format = function(format) {
        // Convert the arguments object into a real array, excluding the first argument (the format string itself).
        var args = Array.prototype.slice.call(arguments, 1);
        // Use replace with a regular expression to find all occurrences of {number}.
        return format.replace(/{(\d+)}/g, function(match, number) {
            // 'match' is the full placeholder (e.g., "{0}")
            // 'number' is the captured group (the digit inside the braces, e.g., "0")
            // Check if an argument exists at the specified index.
            // typeof args[number] != 'undefined' is used instead of just args[number]
            // to correctly handle cases where the argument might be null or 0.
            return typeof args[number] != 'undefined'
                ? args[number] // If the argument exists, replace the placeholder with it.
                : match; // Otherwise, leave the placeholder unchanged.
        });
    };
}

/**
 * Replaces the currently selected text within a specified DOM element with a given DOM node.
 * It ensures that the replacement only happens if the selection is fully contained
 * within the descendants of the provided root element. After replacement, it places
 * the cursor immediately after the inserted node.
 *
 * @param {HTMLElement} root - The container element within which the selection must reside.
 * @param {Node} node - The DOM node (e.g., an element, text node) to insert in place of the selection.
 */
export function replaceSelectedText(root, node) {
    // Get the current window selection object.
    let sel = getDrawPlatform().getSelection();

    // Find the nearest ancestor node of the selection's start point.
    let ancestor = sel.baseNode; // Start from the node where the selection begins

    // Traverse up the DOM tree from the selection's start node
    // until we hit the specified 'root' element or the top of the document.
    while (ancestor && ancestor !== root) {
        ancestor = ancestor.parentNode;
    }

    // Only proceed if the ancestor traversal reached the specified 'root',
    // meaning the selection started within the 'root' element.
    if (ancestor === root) {
        // Check if there is actually a selection range available.
        if (sel.rangeCount) {
            // Get the first selection range (usually there's only one).
            let range = sel.getRangeAt(0);
            // Delete the contents of the current selection range.
            range.deleteContents();
            // Insert the provided 'node' at the now-empty range position.
            range.insertNode(node);
            // Collapse the selection range to be positioned right after the inserted node.
            // This effectively moves the cursor to the end of the inserted content.
            range.setStartAfter(node);
            // Update the window's selection to reflect the new collapsed range.
            // (Note: `addRange` might implicitly remove other ranges first, depending on the browser)
            sel.addRange(range);
        }
    }
}

/**
 * Generates a unique numerical ID within the current session.
 * It uses a counter stored on the platform object.
 * If the counter doesn't exist, it initializes it to 0.
 * Each subsequent call increments and returns the counter.
 *
 * @returns {number} A unique integer ID.
 */
export function getUniqueId() {
    // Check if the unique ID counter exists on the draw platform object.
    // This uses a private-like convention (_uniqueId) but is accessible.
    if (getDrawPlatform()._uniqueId === undefined) {
        // If the counter doesn't exist, initialize it to 0.
        getDrawPlatform()._uniqueId = 0;
    }
    // Increment the counter *after* returning the current value (postfix increment).
    // This ensures the first ID returned is 0, the next is 1, and so on.
    return getDrawPlatform()._uniqueId++;
}

/**
 * Converts a data URL string into a Blob object.
 *
 * This is useful for handling data URLs (often representing images generated
 * on the client-side, like from a canvas) as if they were file objects.
 *
 * @param {string} dataurl - The data URL string (e.g., "data:image/png;base64,iVBORw0KGgo...").
 * @returns {Blob} A Blob object representing the data from the data URL.
 */
function dataURLtoBlob(dataurl) {
    // Split the data URL into two parts: the metadata (containing MIME type) and the base64 data.
    let arr = dataurl.split(','),
        // Extract the MIME type from the metadata part using a regular expression.
        // Example: "data:image/png;base64" -> "image/png"
        mime = arr[0].match(/:(.*?);/)[1],
        // Decode the base64 encoded data part into a binary string.
        bstr = atob(arr[1]),
        // Get the length of the binary string.
        n = bstr.length,
        // Create an 8-bit unsigned integer array with the same length as the binary string.
        u8arr = new Uint8Array(n);

    // Iterate through the binary string (in reverse order for potential minor efficiency).
    while(n--){
        // Get the Unicode character code (which corresponds to the byte value)
        // of the character at the current position in the binary string
        // and store it in the Uint8Array.
        u8arr[n] = bstr.charCodeAt(n);
    }
    // Create and return a new Blob object from the Uint8Array, specifying the extracted MIME type.
    return new Blob([u8arr], {type:mime});
}
/**
 * @typedef {Object} Rule
 * @property {string} name - The name of the container.
 * @property {string[]} urls
 */

/**
 * @typedef {Object} StoredRule
 * @property {Rule[]} rules - The name of the container.
 */

/**
 * @typedef {Object} Container
 * @property {string} name - The name of the container.
 * @property {string} icon - The icon class or identifier for the container.
 * @property {string} iconUrl - The URL of the icon image if available.
 * @property {string} color - The human-readable color description.
 * @property {string} colorCode - The hexadecimal or RGB code of the color.
 * @property {string} cookieStoreId - The identifier for the associated cookie store.
 */

/**
 * @typedef {Object} Rule
 * @property {string} name
 * @property {string[]} urls
 */

class Rules extends EventTarget {
  /** @type {{string: RuleLine}} */
  rules = {};
  /** @type {RuleForm} */
  form = {};
  /** @type {DocumentFragment} */
  body;
  /** @type {HTMLTemplateElement} */
  template;
  /** @type {DocumentFragment} */
  lineTemplate;

  /**
   *
   * @param {Container} containers
   * @param {Rule[]} rules
   */
  constructor(containers, rules) {
    super();
    this.template = document.getElementById("rule-template");
    const rulesMap = rules.reduce((acc, r) => {
      acc[r.name] = r;
      return acc;
    }, {});
    for (const container of containers) {
      const urls = rulesMap[container.name]?.urls ?? [];
      this.rules[container.name] = new RuleLine(
        container.name,
        urls,
        container.colorCode,
      );
    }
  }

  /**
   * @returns {DocumentFragment}
   */
  render() {
    this.body = this.template.content.cloneNode(true);
    const item = this.body.querySelector(".rule-item");
    this.lineTemplate = item.cloneNode(true);
    item.remove();
    const f = document.createDocumentFragment();
    for (const container in this.rules) {
      const rule = this.rules[container];
      rule.addEventListener("click", () => {
        this.dispatchEvent(new CustomEvent("select", { detail: rule }));
      });
      f.appendChild(rule.render(this.lineTemplate));
    }

    this.body.querySelector(".rule-list").appendChild(f);
    this.body
      .querySelector(".rule-search-box")
      .addEventListener("keyup", this.#onFilterRules.bind(this));
    return this.body;
  }

  /**
   *
   * @param {InputEvent} event
   */
  #onFilterRules(event) {
    const value = event.target.value;
    for (const container in this.rules) {
      if (container.includes(value)) {
        this.rules[container].show();
      } else {
        this.rules[container].hide();
      }
    }
  }

  updateRule(name, urls) {
    const rule = this.rules[name];
    rule.updateUrls(urls);
  }

  /**
   * @returns {StoredRule}
   */
  export() {
    const res = [];
    for (const container in this.rules) {
      res.push({
        name: container,
        urls: this.rules[container].urls.filter(Boolean),
      });
    }
    return res;
  }
}

class RuleLine extends EventTarget {
  uuid = "";
  name = "";
  /** @type {string[]} */
  urls = [];
  colorCode = "";
  /** @type {HTMLElement} */
  line;

  /**
   * @param {string} name
   * @param {string[]} urls
   * @param {string} colorCode
   */
  constructor(name, urls, colorCode) {
    super();
    this.name = name;
    this.urls = urls;
    this.colorCode = colorCode;
  }

  /**
   * @param {DocumentFragment} template
   * @return {HTMLElement}
   */
  render(template) {
    /** @type {HTMLElement} */
    this.line = template.cloneNode(true);
    this.line.addEventListener("click", () =>
      this.dispatchEvent(new CustomEvent("click", this)),
    );
    this.#fill();
    return this.line;
  }

  /**
   * @param {HTMLElement} line
   */
  #fill() {
    const [icon, name, count] = this.line.children;
    /** @type {HTMLElement} */
    icon.style.backgroundColor = this.colorCode;
    name.textContent = this.name;
    count.textContent = this.urls.length;
  }

  /**
   * @param {string[]} urls
   */
  updateUrls(urls) {
    this.urls = urls;
    this.#fill();
  }

  hide() {
    this.line.style.display = "none";
  }

  show() {
    this.line.style.display = "flex";
  }
}

class RuleForm extends EventTarget {
  rule;
  urls = {};
  /** @type {DocumentFragment} */
  list;
  /** @type {DocumentFragment} */
  form;
  /** @type {HTMLElement} */
  template;
  /** @type {DocumentFragment} */
  urlTemplate;

  /**
   * @param {RuleLine} rule
   */
  constructor(rule) {
    super();
    this.rule = rule;
    this.template = document.getElementById("form-template");
  }

  /**
   * @return {DocumentFragment}
   */
  render() {
    this.form = this.template.content.cloneNode(true);
    const [back, icon, name] = this.form.querySelector(".form-header").children;
    icon.style.backgroundColor = this.rule.colorCode;
    name.textContent = this.rule.name;

    back.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("close"));
    });

    this.form
      .querySelector(".form-button-add")
      .addEventListener("click", this.addUrl.bind(this));

    this.list = this.form.querySelector(".form-list");

    /** @type {HTMLTemplateElement} */
    const url = this.form.querySelector(".form-item");
    this.urlTemplate = url.cloneNode(true);
    url.remove();

    for (const url of this.rule.urls) {
      const id = crypto.randomUUID();
      this.urls[id] = url;
      this.#renderLine(id, this.urls[id]);
    }
    return this.form;
  }

  #renderLine(id, value) {
    const line = this.urlTemplate.cloneNode(true);
    const [input, button] = line.children;
    line.id = id;
    input.value = value;
    input.addEventListener("change", (event) =>
      this.updateUrl(id, event.target.value),
    );
    button.addEventListener("click", this.deleteUrl.bind(this, id));
    this.list.appendChild(line);
  }

  /**
   *
   * @param {string} id
   * @param {string} value
   */
  updateUrl(id, value) {
    this.urls[id] = value;
    this.#dispatchChanges();
  }

  addUrl() {
    const id = crypto.randomUUID();
    this.urls[id] = "";
    this.#renderLine(id, this.urls[id]);
    this.#dispatchChanges();
  }

  deleteUrl(id) {
    delete this.urls[id];

    this.list.querySelector(`[id="${id}"]`).remove();
    this.#dispatchChanges();
  }

  #dispatchChanges() {
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: { name: this.rule.name, urls: Object.values(this.urls) },
      }),
    );
  }
}

(async () => {
  const body = document.body;
  const rulesSection = document.getElementById("rules");
  const formSection = document.getElementById("form");

  // const storedRules = [
  //   {
  //     name: "test",
  //     urls: ["github"],
  //   },
  // ];
  // const containers = [
  //   {
  //     name: "test",
  //     colorCode: "#eee",
  //   },
  // ];

  const containers = await browser.contextualIdentities.query({});
  /** @type {StoredRule} */
  const storedRules = await browser.storage.sync.get("rules");

  if (!storedRules.rules?.length) {
    storedRules.rules = [];
  }

  const rules = new Rules(containers, storedRules.rules);
  rulesSection.appendChild(rules.render());

  rules.addEventListener("select", onSelectRule);
  let form = null;

  async function onRuleChange(event) {
    const { name, urls } = event.detail;
    rules.updateRule(name, urls);
    await browser.storage.sync.set({
      rules: rules.export(),
    });
  }

  function onSelectRule(event) {
    body.classList.add("form-active");
    form = new RuleForm(event.detail);
    form.addEventListener("change", onRuleChange);
    formSection.appendChild(form.render());
    form.addEventListener("close", onCloseForm);
  }

  function onCloseForm(event) {
    body.classList.remove("form-active");
    setTimeout(() => {
      formSection.replaceChildren();
    }, 300);
  }
})();

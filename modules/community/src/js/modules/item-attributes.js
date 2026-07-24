const cartesian = (a) => a.reduce((a, b) => a.flatMap(x => b.map(y => [...x, y])), [[]]);

window.itemAttributes = function () {
  return {
    selectedAttribute: null,
    store: Alpine.store('variants'),

    selectAttribute(event) {
      let oldSelected = this.selectedAttribute;
      delete this.store.attributes[oldSelected];
      this.selectedAttribute = event.target.value;
      if (this.selectedAttribute in this.store.attributes === false) {
        this.$dispatch("select-multiple", { selectElement: document.querySelector(`#select-${oldSelected}`) });
        this.store.attributes[this.selectedAttribute] = [];
        this.$nextTick(() => Alpine.store('keys')[Alpine.store('keys').indexOf(oldSelected)] = this.selectedAttribute);
      } else {
        this.$nextTick(() => {Alpine.store('keys').splice(Alpine.store('keys').indexOf(oldSelected), 1); });
      }
    },

    removeAttribute(){
      this.$nextTick(() => {Alpine.store('keys').splice(Alpine.store('keys').indexOf(this.selectedAttribute), 1); });
      delete this.store.attributes[this.selectedAttribute];
      this.store.variants = this.generateVariantsMatrix();
    },

    selectOptions() {
      let values = [...this.$el.closest('ul').querySelectorAll('[type="checkbox"]:checked')].map(option => option.value);
      // values = [...this.$el.options].filter(option => option.selected).map(option => option.value);
      if (values.length > 0) {
        this.store.attributes[this.selectedAttribute] = this.selectedAttributes(values);
      } else {
        delete this.store.attributes[this.selectedAttribute];
      }
      this.store.variants = this.changeVariantsMatrix();
      Alpine.store("keys", Object.keys(Alpine.raw(this.store.attributes)));
    },

    selectedAttributes(values) {
      return this.store.allAttributes[this.selectedAttribute].filter(attribute => values.includes(attribute.value));
    },

    generateVariantsMatrix() {
      // eslint-disable-next-line
      return cartesian(Object.entries(this.store.attributes).map(([_name, attributes]) => attributes))
        .map(attributes => { return { attributes_json: attributes }; });
    },

    addVId(variants) {
      return variants.map(x => { x['vId'] = x.attributes_json.map(e => e.value).sort(); return x; });
    },

    changeVariantsMatrix() {
      let newVariants = this.generateVariantsMatrix();
      let existingVariants = Alpine.raw(this.store.variants);
      newVariants = this.addVId(newVariants);
      existingVariants = this.addVId(existingVariants);

      let variants = [];
      if (newVariants.length < existingVariants.length){
        newVariants.forEach(nV => {
          let match = existingVariants.find(eV => nV.vId.every(x => eV.vId.includes(x)));
          if (match) variants.push(match);
        });
      } else {
        newVariants.forEach(nV => {
          let match = existingVariants.find(eV => nV.vId.every(x => eV.vId.includes(x)));
          if (match) {
            variants.push(match);
          } else {
            variants.push(nV);
          }
        });
      }

      return variants;
    }

  };
};

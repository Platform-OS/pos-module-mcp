function validEmail(email) {
  // eslint-disable-next-line max-len
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

const fetchUsers = async (query, skip_profile_ids) => {
  if (query.length < 3) {
    return [];
  }

  const r = await fetch(`/api/users/search_users_or_emails.json?query=${encodeURIComponent(query)}&skip=${encodeURIComponent(skip_profile_ids)}`);
  if (r.ok) {
    const json = await r.json();
    return json.results
      .map(u => {
        let photo;
        if (u.avatar)
          photo = u.avatar.photo.url;

        let profileLink = '';
        if(u.id == '') {
          profileLink = '';
        } else {
          profileLink = `<span class="text-sm"><a href="/profile/${u.slug}" target="_blank">see profile</a></span>`
        }

        return {
          id: u.id,
          email: u.email,
          displayName: "",
          name:  u.name,
          profileLink: profileLink,
          photo: photo
        };
      });
  }
  else
    return [];
};

class MSet {
  constructor(arr) {
    this.items = arr || [];
  }

  add(o){
    if (!this.has(o))
      this.items = [...this.items, o];

    return this.items;
  }

  delete(o){
    this.items = this.items.filter(i => i.id !== o.id);
    return this.items;
  }

  has(o){
    return this.items.map(i => i.id).includes(o.id);
  }
}

window.invites = function () {
  return {
    query: "",
    skip_profile_ids: "",

    selected: new MSet(),
    suggestions: new MSet(),
    sourceSuggestions: [],
    showSuggestions: false,

    initManual({emails}){
      this.selected = new MSet(emails.map((email) => { return { displayName: email, email: email }; }));
    },

    prepareSuggestions(){
      const list = this.sourceSuggestions.filter(u => !this.selected.has(u));

      this.suggestions = new MSet(list);

      /*
       * Commented because it does not work for now:
       *
       * ERROR: could not create profile:: {"first_name":"janedoe8","last_name":"janedoe8","user_id":null,"email":"janedoe8@example.com","uuid":"01f22e04-c109-4133-a8b6-f8c3fbd2ad1b","name":"janedoe8 janedoe8","slug":"janedoe8janedoe8","c__names":"janedoe8 janedoe8@example.com","bank_at_graduation_year":null,"graduation_year":null,"date_of_birth":null,"errors":{"user_id":["cannot be blank"],"date_of_birth":["cannot be blank"],"graduation_year":["cannot be blank"],"terms_and_conditions":["Please accept the terms and conditions"],"code_of_conduct":["Please accept the Code of Conduct"]},"valid":false}
       *
      if (validEmail(this.query) && this.sourceSuggestions.length == 0 )
        this.suggestions.add(this.build(this.query));
      */
    },

    async loadSuggestions() {
      this.sourceSuggestions = await fetchUsers(this.query, this.skip_profile_ids);
      this.prepareSuggestions();
    },

    register(entry){
      this.selected.add(entry);
      this.clear();
    },

    remove(entry){
      this.selected.delete(entry);
      this.prepareSuggestions();
    },

    clear(){
      this.query = "";
      this.suggestions = new MSet();
    },

    emailList(){
      return this.selected.items.map(e => e.email).join(",");
    },

    build(email) {
      return {
        displayName: email, email: email, name: "Not registerd yet (send invite)", exists: false
      };
    }
  };
};

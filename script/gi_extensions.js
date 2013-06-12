/********** 
	Reusables
**********/



var StringtoXML = function(text){
	if (window.ActiveXObject){
	  var doc=new ActiveXObject('Microsoft.XMLDOM');
	  doc.async='false';
	  doc.loadXML(text);
	} else {
	  var parser=new DOMParser();
	  var doc=parser.parseFromString(text,'text/xml');
	}
	return doc;
}

Ext.override(Ext.data.Store, {
    /**
     * Sort by multiple fields in the specified order.
     * @param {Array} An Array of field sort specifications, or, if ascending
     * sort is required on all columns, an Array of field names. A field specification
     * looks like:
{
    field: 'orderNumber',
    direction: 'ASC'
}
     */
    sortByFields: function(fields) {
        
//      Collect sort type functions,
//      Convert string field names to field+direction spec objects.
        var st = [];
        for (var i = 0; i < fields.length; i++) {
            if (typeof fields[i] == 'string') {
                fields[i] = {
                    field: fields[i],
                    direction: 'ASC'
                };
            }
            st.push(this.fields.get(fields[i].field).sortType);
        }

        var fn = function(r1, r2) {
            var result;
            for (var i = 0; !result && i < fields.length; i++) {
                var v1 = st[i](r1.data[fields[i].field]);
                var v2 = st[i](r2.data[fields[i].field]);
                result = (v1 > v2) ? 1 : ((v1 < v2) ? -1 : 0);
                if (fields[i].direction == 'DESC') result = -result;
            }
            return result;
        };
        this.data.sort('ASC', fn);
        if(this.snapshot && this.snapshot != this.data){
            this.snapshot.sort('ASC', fn);
        }
        this.fireEvent("datachanged", this);
    }
});



var numfield = new Ext.form.NumberField({  // rules about editing
	allowBlank: false,
	maxLength: 3
});

// A new DataWriter component.
var writer = new Ext.data.JsonWriter({
	 encode: true,
	 writeAllFields: false
});

// A selectionbox component
var sm = new Ext.grid.CheckboxSelectionModel({
	listeners: {
		selectionchange: function(sm) {}
	}

});


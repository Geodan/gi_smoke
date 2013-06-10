Ext.ux.LinkButton = Ext.extend(Ext.Button, {
    href: null,
    handler: function() {
        if (this.href) {
            window.location.href = this.href;
        }
    } 
}); 
Ext.reg( "ux-linkbutton", Ext.ux.LinkButton );



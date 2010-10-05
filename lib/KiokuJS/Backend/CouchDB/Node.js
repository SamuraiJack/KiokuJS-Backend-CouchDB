Class('KiokuJS.Backend.CouchDB.Node', {
    
    isa         : 'KiokuJS.Node',
    
    
    has : {
        REV         : null
    },
    

    methods : {
        
        buildEntry   : function () {
            
            var entry = this.SUPER()
            
            if (entry.ID != null) {
                entry._id = entry.ID
                
                delete entry.ID
            }
            
            if (this.REV != null) entry._rev = this.REV
            
            return entry
        }
    },
    
    
    after : {
        
        consumeOldNode : function (oldNode) {
            if (!this.REV && oldNode.REV) this.REV = oldNode.REV
        }        
    },
    

    my : {
        
        methods : {
        
            newFromEntry : function (entry, resolver) {
                entry.resolver   = resolver
                
                entry.REV      = entry._rev
                entry.ID       = entry._id
                
                delete entry._rev
                delete entry._id
                
                return new this.HOST(entry)
            }
        }
    }
        
    
})
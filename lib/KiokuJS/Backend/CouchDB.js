Class('KiokuJS.Backend.CouchDB', {
    
    isa     : 'KiokuJS.Backend',
    
    use     : [
        Joose.is_NodeJS ? 'HTTP.Request.Provider.NodeJS' : 'HTTP.Request.Provider.XHR',
        
        'KiokuJS.Backend.CouchDB.Node'
    ],
    
    
    has : {
        host            : { required : true },
        port            : 5984,
        prefix          : '',
        
        dbName          : { required : true },
        
        nodeClass       : Joose.I.FutureClass('KiokuJS.Backend.CouchDB.Node'),
        
        requestProviderClass   : Joose.I.FutureClass(Joose.is_NodeJS ? 'HTTP.Request.Provider.NodeJS' : 'HTTP.Request.Provider.XHR')
    },
    
    
    after : {
        
        initialize : function () {
            this.prefix = this.prefix.replace(/\/+$/, '')
        }
    },
    
    methods : {
        
        getRequest : function (config) {
            return new this.requestProviderClass(config)
        },
        
        
        getURLforCouch : function () {
            return 'http://' + this.host + ':' + this.port + '/' + this.prefix 
        },
        
        
        getURLforDB : function () {
            return this.getURLforCouch() + '/' + this.dbName
        },
        
        
        evalJSON : function (str) {
            return eval('var a = ' + str + '; a')
        }
    },
    
    
    
    continued : {
        
        methods : {
            
            createDB : function () {
                this.getRequest({
                    method          : 'PUT',
                    
                    url             : this.getURLforDB()
                    
                }).andThen(function (res) {
                    
                    this.CONTINUE(this.evalJSON(res.text))
                    
                }, this)
            },
            
            
            deleteDB : function () {
                this.getRequest({
                    method          : 'DELETE',
                    
                    url             : this.getURLforDB()
                    
                }).andThen(function (res) {
                    
                    this.CONTINUE(this.evalJSON(res.text))
                    
                }, this)
            },
            
            
            insertSingleEntry : function (id, entry) {
                this.getRequest({
                    method          : 'PUT',
                    
                    url             : this.getURLforDB() + '/' + id,
                    
                    data            : entry
                    
                }).andThen(function (res) {
                    
                    var response = this.evalJSON(res.text)
                    
                    this.CONTINUE(response.id)
                    
                }, this)
            },
            
            
            getSingleEntry  : function (id) {
                this.getRequest({
                    method          : 'GET',
                    
                    url             : this.getURLforDB() + '/' + id
                    
                }).andThen(function (res) {
                    
                    this.CONTINUE(res.text)
                })
            },
            
            
            get     : function (idsToGet, scope, mode) {
                var me              = this
                var CONT            = this.CONT
                
                
                Joose.A.each(idsToGet, function (id) {
                    
                    CONT.AND(function () {
                        me.getSingleEntry(id).except(function () {
                            
                            this.CONTINUE(null)
                        }).now()
                    })
                })
                
                CONT.andThen(function () {
                    
                    var entries = Joose.A.map(arguments, function (returned) {
                        return returned[0]
                    })
                    
                    this.CONTINUE(me.deserializeNodes(entries))
                })
            },
            
            
            insert  : function (nodesToInsert, scope, mode) {
                var me              = this
                var CONT            = this.CONT
                
                Joose.A.each(this.serializeNodes(nodesToInsert), function (entry, index) {
                    
                    CONT.AND(function () {
                        me.insertSingleEntry(nodesToInsert[ index ].ID, entry).except(function (e) {
                            
                            this.CONTINUE(new KiokuJS.Exception({
                                nativeEx : e
                            }))
                            
                        }).now()
                    })
                })
                
                CONT.andThen(function () {

                    var ids = Joose.A.map(arguments, function (insertResult, index) {
                        var id = insertResult[0]
                        
                        if (id instanceof KiokuJS.Exception) throw id
                        
                        return id
                    })
                    
                    this.CONTINUE(ids)
                })
            },
            
            
            remove  : function (idsToRemove) {
//                var entries = this.entries
//                
//                Joose.A.each(idsToRemove, function (id) {
//                    delete entries[ id ]
//                })
//                
//                setTimeout(this.getCONTINUE(), 0)
            },
            
            
            exists  : function (idsToCheck) {
//                var entries = this.entries
//                
//                var res = Joose.A.map(idsToCheck, function (id) {
//                    return entries[ id ] != null
//                })
//                
//                var CONTINUE = this.getCONTINUE()
//                
//                setTimeout(function () {
//                    CONTINUE(res)
//                }, 0)
            }
        }
    }

})

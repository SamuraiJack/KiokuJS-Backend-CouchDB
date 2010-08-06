Class('KiokuJS.Backend.CouchDB', {
    
    isa     : 'KiokuJS.Backend',
    
    use     : [
        Joose.is_NodeJS ? 'HTTP.Request.Provider.NodeJS' : 'HTTP.Request.Provider.XHR',
        
        'KiokuJS.Backend.CouchDB.Node',
        
        'KiokuJS.Exception.Format',
        'KiokuJS.Exception.Network',
        'KiokuJS.Exception.LookUp',
        'KiokuJS.Exception.Overwrite', 
        'KiokuJS.Exception.Update',
        'KiokuJS.Exception.Conflict'
    ],
    
    does    : [ 'KiokuJS.Backend.Feature.Overwrite', 'KiokuJS.Backend.Feature.Update' ],
    
    
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
            try {
                return eval('var a = ' + str + '; a')
            } catch (e) {
                throw new KiokuJS.Exception.Format({ message : 'Invalid JSON: ' + str })
            }
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
            
            
            insertSingleEntry : function (id, rev, entry, mode) {
                this.getRequest({
                    method          : 'PUT',
                    
                    url             : this.getURLforDB() + '/' + id,
                    
                    data            : entry
                    
                }).except(function (e) {
                    
                    if (e.status == 409) {
                        var response = this.evalJSON(e.text)
                        
                        if (response.error == 'conflict') {
                            
                            if (mode == 'insert')           throw new KiokuJS.Exception.Overwrite({ message : 'ID = [' + id + ']' })
                            if (!rev && mode == 'update')   throw new KiokuJS.Exception.Update({ message : 'ID = [' + id + ']' })

                            throw new KiokuJS.Exception.Conflict({ message : 'ID = [' + id + ']' })
                        }
                    }
                    
                    
                    throw new KiokuJS.Exception.Network({
                        nativeEx : e
                    })
                    
                }, this).andThen(function (res) {
                    
                    var response = this.evalJSON(res.text)
                    
                    if (response.ok) 
                        this.CONTINUE(response.id, response.rev)
                    else
                        throw new KiokuJS.Exception({ message : res.text })
                        
                    
                }, this)
            },
            
            
            getSingleEntry  : function (id, rev) {
                this.getRequest({
                    method          : 'GET',
                    
                    url             : this.getURLforDB() + '/' + id,
                    
                    query           : rev ? { rev : rev } : null
                    
                }).except(function (e) {
                    
                    if (e.status == 404)
                        throw new KiokuJS.Exception.LookUp({
                            message : 'Id [' + id + '] not found'
                        })
                        
                    throw new KiokuJS.Exception.Network({
                        nativeEx : e
                    })
                    
                }).andThen(function (res) {
                    
                    this.CONTINUE(res.text)
                })
            },
            
            
            get     : function (idsToGet, scope, mode) {
                var me              = this
                var CONT            = this.CONT
                
                
                
                Joose.A.each(idsToGet, function (id) {
                    
                    CONT.AND(function () {
                        me.getSingleEntry(id).now()
                    })
                })
                
                CONT.andThen(function () {
                    
                    var entries = Joose.A.map(arguments, function (returned) {
                        var res = returned[0]
                        
                        if (res instanceof KiokuJS.Exception) throw res
                        
                        return res
                    })
                    
                    this.CONTINUE(me.deserializeNodes(entries))
                })
            },
            
            
            insert  : function (nodesToInsert, scope, mode) {
                var me              = this
                var CONT            = this.CONT
                
                Joose.A.each(this.serializeNodes(nodesToInsert), function (entry, index) {
                    
                    CONT.AND(function () {
                        var node = nodesToInsert[ index ]
                        
                        me.insertSingleEntry(node.ID, node.REV, entry, mode).andThen(function (id, rev) {
                            node.REV = rev
                            
                            this.CONTINUE()
                        })
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
            
            
            
            remove  : function (idsOrNodes) {
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

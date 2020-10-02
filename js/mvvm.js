
/*
    相当于Vue的构造函数
*/
function MVVM(options) {
    //  将配置对象保存到vm对象的$options上
    this.$options = options || {};
    //  将配置对象保存到变量data和vm实例上
    var data = this._data = this.$options.data;
    //  将vm保存到变量me上
    var me = this;

    // 数据代理
    // 实现 vm.xxx -> vm._data.xxx
    // 遍历data中所有属性
    Object.keys(data).forEach(function(key) {
        //  对指定属性实现数据代理
        me._proxyData(key);
    });

    this._initComputed();

    observe(data, this);

    //  创建编译对象，编译解析模板
    this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
    constructor: MVVM,
    $watch: function(key, cb, options) {
        new Watcher(this, key, cb);
    },

    _proxyData: function(key, setter, getter) {
        var me = this;
        setter = setter ||
        //  给vm重新指定（于data中对应的）属性，让外部取值时通过取
        //  配置对象中的对应的属性值来返回
        //  赋值时也是给配置对象中的属性进行赋值
        Object.defineProperty(me, key, {
            //  不可以重新定义
            configurable: false,
            //  可以遍历枚举
            enumerable: true,
            //  当通过vm.xxx读取属性时自动调用，函数的返回值作为属性值，this是vm
            get: function proxyGetter() {
                //  取data对象中的同名属性值
                return me._data[key];
            },
            //  当通过vm.xxx=newVal修改属性值时自动调用，监视属性值变化，this是vm
            set: function proxySetter(newVal) {
                //  将最新值保存到data对象中的同名属性上
                me._data[key] = newVal;
            }
        });
    },

    _initComputed: function() {
        var me = this;
        var computed = this.$options.computed;
        if (typeof computed === 'object') {
            Object.keys(computed).forEach(function(key) {
                Object.defineProperty(me, key, {
                    get: typeof computed[key] === 'function'
                            ? computed[key]
                            : computed[key].get,
                    set: function() {}
                });
            });
        }
    }
};

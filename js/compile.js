function Compile(el, vm) {
    this.$vm = vm;
    //  保存el元素
    this.$el = this.isElementNode(el) ? el : document.querySelector(el);

    if (this.$el) {
        //  1、取出el中所有子节点，转移到fragment对象中
        this.$fragment = this.node2Fragment(this.$el);
        //  2、编译fragment所有层次子节点
        this.init();
        //  3、将编译好的所有子节点添加回el元素
        this.$el.appendChild(this.$fragment);
    }
}

Compile.prototype = {
    constructor: Compile,
    node2Fragment: function(el) {
        var fragment = document.createDocumentFragment(),
            child;

        // 将原生节点拷贝到fragment
        while (child = el.firstChild) {
            fragment.appendChild(child);
        }

        return fragment;
    },

    init: function() {
        this.compileElement(this.$fragment);
    },

    //  编译指定el的所有子节点
    compileElement: function(el) {
        //  得到所有外层的子节点
        var childNodes = el.childNodes,
            me = this;
        //  遍历子节点
        [].slice.call(childNodes).forEach(function(node) {
            //  得到节点的文本内容
            var text = node.textContent;
            //  定义插值语法的正则
            var reg = /\{\{(.*)\}\}/;
            //  若节点是元素节点
            if (me.isElementNode(node)) {
                //  编译元素节点中的指令属性
                me.compile(node);
            //  若节点是一个插值语法格式的文本节点
            } else if (me.isTextNode(node) && reg.test(text)) {
                //  编译插值语法的文本节点
                me.compileText(node, RegExp.$1.trim());
            }
            //  如果这个子节点有下一级子节点
            if (node.childNodes && node.childNodes.length) {
                //  递归调用 ===>  实现所有层次子节点编译
                me.compileElement(node);
            }
        });
    },

    compile: function(node) {
        var nodeAttrs = node.attributes,
            me = this;

        [].slice.call(nodeAttrs).forEach(function(attr) {
            var attrName = attr.name;
            if (me.isDirective(attrName)) {
                var exp = attr.value;
                var dir = attrName.substring(2);
                // 事件指令
                if (me.isEventDirective(dir)) {
                    compileUtil.eventHandler(node, me.$vm, exp, dir);
                    // 普通指令
                } else {
                    compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
                }

                node.removeAttribute(attrName);
            }
        });
    },

    compileText: function(node, exp) {
        compileUtil.text(node, this.$vm, exp);
    },

    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },

    isEventDirective: function(dir) {
        return dir.indexOf('on') === 0;
    },

    isElementNode: function(node) {
        return node.nodeType == 1;
    },

    isTextNode: function(node) {
        return node.nodeType == 3;
    }
};

//  指令处理集合
//  包含多个编译模板语法的方法对象
var compileUtil = {
    //  编译  v-text    /   {{}}
    text: function(node, vm, exp) {
        this.bind(node, vm, exp, 'text');
    },
    //  编译  v- html    /   {{}}
    html: function(node, vm, exp) {
        this.bind(node, vm, exp, 'html');
    },
    //  编译  v-model    /   {{}}
    model: function(node, vm, exp) {
        this.bind(node, vm, exp, 'model');

        var me = this,
            val = this._getVMVal(vm, exp);
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }

            me._setVMVal(vm, exp, newValue);
            val = newValue;
        });
    },
    //  编译  v-class    /   {{}}
    class: function(node, vm, exp) {
        this.bind(node, vm, exp, 'class');
    },

    //  真正编译模板语法的方法
    //  exp：表达式 name
    //  dir：指令名 text/html/class/model
    bind: function(node, vm, exp, dir) {
        //  根据指令名得到对应的更新节点的函数
        var updaterFn = updater[dir + 'Updater'];
        //  执行更新函数去更新节点（第一次更新==>初始化显示；）
        updaterFn && updaterFn(node, this._getVMVal(vm, exp));

        new Watcher(vm, exp, function(value, oldValue) {
            updaterFn && updaterFn(node, value, oldValue);
        });
    },

    // 事件处理
    eventHandler: function(node, vm, exp, dir) {
        var eventType = dir.split(':')[1],
            fn = vm.$options.methods && vm.$options.methods[exp];

        if (eventType && fn) {
            node.addEventListener(eventType, fn.bind(vm), false);
        }
    },

    _getVMVal: function(vm, exp) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k) {
            val = val[k];
        });
        return val;
    },

    _setVMVal: function(vm, exp, value) {
        var val = vm;
        exp = exp.split('.');
        exp.forEach(function(k, i) {
            // 非最后一个key，更新val的值
            if (i < exp.length - 1) {
                val = val[k];
            } else {
                val[k] = value;
            }
        });
    }
};



//  包含一些用于进行DOM更新的方法的工具对象
var updater = {
    //  更新节点的textContent属性
    textUpdater: function(node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },
    //  更新节点的innerHTML属性
    htmlUpdater: function(node, value) {
        node.innerHTML = typeof value == 'undefined' ? '' : value;
    },
    //  更新节点的className属性
    classUpdater: function(node, value, oldValue) {
        var className = node.className;
        className = className.replace(oldValue, '').replace(/\s$/, '');

        var space = className && String(value) ? ' ' : '';

        node.className = className + space + value;
    },
    //  更新节点的value属性
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    }
};

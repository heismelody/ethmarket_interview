var example1 = new Vue({
  el: '#example-1',
  data: {
    items: [
      { message: 'Foo' },
      { message: 'Bar' }
    ]
  }
})

//---------model-----
var orders = [];   //All order
var deals = [];    //Dealed order
var buys = [];     //Order for buy: High -> low
var sells = [];    //Order for sell: Low -> High
//---------model-----

function isSellOrder(order) {
  return (order.side == "ask");
}

Array.prototype.insert = function (index, item) {
  this.splice(index, 0, item);
};

var ordersVue = new Vue({
  el: "#order-list",

  data: {
    "orders": orders,
    "buys": buys,
    "sells": sells,
    "deals": deals,
  },

  init: this.fetchOrders,

  ready: function() {
    setInterval(this.fetchOrders, 2000);
  },

  methods: {
    fetchOrders: function() {
      var self = this;
      $.ajax({
	    type: "GET",
	    url: "/listOrders",
	    dataType: "json",
	    data: {
          "start": "0",
          "size": "100"
        },
	    success: function(resp) {
        if(resp) {
          for(var i = self.orders.length; i < resp.length; i++)
          {
            if(resp[i].price && (resp[i].quantity > 0)) {
              console.log(resp[i].quantity);
              self.orders.push(resp[i]);
              self.handleNewOrder(resp[i]);
            }
          }
        }
	    },
	    error: function(jqXHR, exception) {
	      console.log("Failed to get chain height!");
          self.orders = [];
	    }
      });
    },

    handleNewOrder : function (neworder) {
      if(isSellOrder(neworder)) {
        if(this.buys.length == 0) {
          this.pushToSellList(neworder);
        }
        else {
          this.tryToSell(neworder);
        }
      }
      else {
        if(this.sells.length == 0) {
          this.pushToBuyList(neworder);
        }
        else {
          this.tryToBuy(neworder);
        }
      }
    },

    sell: function (neworder,quan) {
      this.deals.push({
        "sellnum": neworder.number,
        "buynum": this.buys[0].number,
        "quantity": quan,
        "price": (this.buys[0].price + neworder.price) / 2,
        "date":new Date(),
      });

      this.buys[0].quantity = this.buys[0].quantity - quan;
      if(this.buys[0].quantity == 0) {
        this.buys.shift();
      }
      neworder.quantity = neworder.quantity - quan;

      return neworder;
    },

    buy: function (neworder,quan) {
      this.deals.push({
        "sellnum": this.sells[0].number,
        "buynum": neworder.number,
        "quantity": quan,
        "price": (this.sells[0].price + neworder.price) / 2,
        "date":new Date(),
      });

      this.sells[0].quantity = this.sells[0].quantity - quan;
      if(this.sells[0].quantity == 0) {
        this.sells.shift();
      }
      neworder.quantity = neworder.quantity - quan;

      return neworder;
    },

    //Try to deal sell order, if sucess we make this deal;
    //                        Else we pushToSellList;
    tryToSell: function(neworder) {
      if(!this.buys[0] || neworder.price > this.buys[0].price) {
        this.pushToSellList(neworder);
      }
      else {
        if(neworder.quantity <= this.buys[0].quantity) {
          this.sell(neworder,neworder.quantity);
        }
        else {
          neworder = this.sell(neworder,this.buys[0].quantity);
          this.tryToSell(neworder);
        }
      }
    },

    //Try to deal buy order, if sucess we make this deal;
    //                        Else we pushToBuyList;
    tryToBuy: function (neworder) {
      if(!this.sells[0] || neworder.price < this.sells[0].price) {
        this.pushToBuyList(neworder);
      }
      else {
        if(neworder.quantity <= this.sells[0].quantity) {
          this.buy(neworder,neworder.quantity);
        }
        else {
          neworder = this.buy(neworder,this.sells[0].quantity);
          this.tryToBuy(neworder);
        }
      }
    },

    //For unselled order, we insert into the sell array.
    pushToSellList: function(neworder) {
      for(let i in this.sells) {
        if(neworder.price < this.sells[i].price) {
          this.sells.insert(i,neworder);
          return;
        }
        else if (neworder.price == this.sells[i].price) {
          if(neworder.number <= this.sells[i].number)
          {
            this.sells.insert(i,neworder);
            return;
          }
        }
      }
      //this.sells.push(neworder);
      return;
    },

    //For unboughted order, we insert into the buy array.
    pushToBuyList: function(neworder) {
      for(let i in this.buys) {
        if(neworder.price > this.buys[i].price) {
          this.buys.insert(i,neworder);
          return;
        }
        else if (neworder.price == this.buys[i].price) {
          if(neworder.number <= this.buys[i].number)
          {
            this.buys.insert(i,neworder);
            return;
          }
        }
      }
      this.buys.push(neworder);
      return;
    }
  }
});

var dealVM = new Vue({
  el : "#deal-list",

  data: {
    "deals" : deals,
    "showMax" : 30,
  },

  wathc: {

  }
});

var topBuyVM = new Vue({
  el: "#top-buy-list",

  data: {
    "buys": buys,
    "showMax" : 20,
  },

  watch: {
    orders: function (val) {

    }
  }
});

var topSellVM = new Vue({
  el: "#top-sell-list",

  data: {
    "sells" : sells,
    "showMax" : 20,
  },
});


(function reset() {
  $.ajax({
	type: "GET",
	url: "/reset"
  })
})();
